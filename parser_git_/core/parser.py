"""
Parser — извлечение "сырых" данных из листа Excel.

Важно (см. ТЗ, раздел 7 и 35): parser не должен хардкодить, что "группа
всегда в столбце E" или "понедельник всегда в строке 13". Вместо этого
он ищет структуру по опорным меткам:

- строка с "День" / "Время" в столбцах B/C — начало шапки таблицы;
- ячейки "Ауд." в шапке — по ним вычисляются столбцы предмета/аудитории/
  корпуса для каждого блока (поток/специализация -> группа);
- ячейки с сокращениями дней недели (Пн, Вт, ...) в столбце B — начало
  блока конкретного дня, с учётом merge (день пишется один раз на
  8 строк);
- столбец "Время" читается по факту, а не по жёстко заданному списку
  восьми пар.

Это должно пережить, например, смещение шапки на одну строку (лист
"3 курс" в реальном файле устроен именно так — читай ANALYSIS.md).
"""

from __future__ import annotations

import re
import shutil
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

TIME_RE = re.compile(r"^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$")
DAY_ABBREVIATIONS = {"пн", "вт", "ср", "чт", "пт", "сб", "вс"}


# ---------------------------------------------------------------------------
# Загрузка книги. Реальные выгрузки НИУ ВШЭ нередко содержат невалидные
# значения border-style в styles.xml (например "solid"/"none" вместо
# допустимых значений OOXML), из-за чего openpyxl отказывается читать файл.
# Чтобы parser не был хрупким к этой (известной) особенности источника,
# при такой ошибке делается щадящая починка стилей во временной копии.
# ---------------------------------------------------------------------------

_VALID_BORDER_STYLES = {
    "mediumDashed", "dashDotDot", "mediumDashDot", "slantDashDot", "dotted",
    "double", "dashed", "medium", "thick", "thin", "hair", "dashDot",
    "mediumDashDotDot",
}


def _sanitize_styles_xml(xml_bytes: bytes) -> bytes:
    text = xml_bytes.decode("utf-8")
    text = text.replace('style="solid"', 'style="thin"')
    text = text.replace('style="none"', "")
    return text.encode("utf-8")


def load_workbook_resilient(path: Path):
    try:
        return openpyxl.load_workbook(path, data_only=True)
    except ValueError as exc:
        if "stylesheet" not in str(exc).lower():
            raise
        # Похоже на битые border-style — чиним временную копию.
        tmp_dir = Path(tempfile.mkdtemp(prefix="schedule_parser_"))
        fixed_path = tmp_dir / "fixed.xlsx"
        with zipfile.ZipFile(path, "r") as zin, zipfile.ZipFile(
            fixed_path, "w", zipfile.ZIP_DEFLATED
        ) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "xl/styles.xml":
                    data = _sanitize_styles_xml(data)
                zout.writestr(item, data)
        try:
            return openpyxl.load_workbook(fixed_path, data_only=True)
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Индекс merged-ячеек: для любой (row, col) внутри объединённого диапазона
# отдаёт значение из его верхней левой ячейки. Это нужно и для обычных
# шапок, и для "блоков-заглушек" вроде многострочной заметки про
# английский язык, которая физически хранится один раз в верхней левой
# ячейке объединения.
# ---------------------------------------------------------------------------


class MergedIndex:
    def __init__(self, ws: Worksheet):
        self._map: dict[tuple[int, int], tuple[int, int]] = {}
        for merged_range in ws.merged_cells.ranges:
            top_left = (merged_range.min_row, merged_range.min_col)
            for r in range(merged_range.min_row, merged_range.max_row + 1):
                for c in range(merged_range.min_col, merged_range.max_col + 1):
                    self._map[(r, c)] = top_left

    def top_left_of(self, row: int, col: int) -> tuple[int, int]:
        return self._map.get((row, col), (row, col))

    def is_top_left(self, row: int, col: int) -> bool:
        return self.top_left_of(row, col) == (row, col)


def effective_value(ws: Worksheet, merged: MergedIndex, row: int, col: int):
    tr, tc = merged.top_left_of(row, col)
    return ws.cell(row=tr, column=tc).value


# ---------------------------------------------------------------------------
# Структуры "сырых" данных, которые отдаёт parser normalizer'у.
# ---------------------------------------------------------------------------


@dataclass
class RawGroupBlock:
    group_name: str
    stream_label: str
    subject_col: int
    room_col: int
    building_col: int


@dataclass
class RawScheduleMeta:
    faculty: Optional[str]
    program: Optional[str]
    course: Optional[int]
    module: Optional[int]
    period_start_raw: Optional[str]
    period_end_raw: Optional[str]


@dataclass
class RawBuildingEntry:
    code: str
    address: str


@dataclass
class RawCell:
    group_name: str
    stream_label: str
    day_raw: str
    start_time: str
    end_time: str
    subject_text: Optional[str]
    room_text: Optional[str]
    building_text: Optional[str]
    coordinate: str


@dataclass
class RawSheet:
    sheet_name: str
    meta: RawScheduleMeta
    buildings: list[RawBuildingEntry]
    cells: list[RawCell] = field(default_factory=list)
    sheet_notes: list[str] = field(default_factory=list)
    structural_errors: list[str] = field(default_factory=list)


TITLE_RE = re.compile(
    r"(\d+)\s*курс,\s*(\d+)\s*модуль\s*\(([\d.]+)\s*-\s*([\d.]+)\)"
)


def _find_title_cell(ws: Worksheet):
    for row in ws.iter_rows(min_row=1, max_row=1):
        for cell in row:
            if isinstance(cell.value, str) and "БАКАЛАВРИАТ" in cell.value:
                return cell.value
    return None


def parse_metadata(ws: Worksheet, faculty: str, program: str) -> RawScheduleMeta:
    title = _find_title_cell(ws)
    course = module = None
    p_start = p_end = None
    if title:
        m = TITLE_RE.search(title)
        if m:
            course = int(m.group(1))
            module = int(m.group(2))
            p_start = m.group(3)
            p_end = m.group(4)
    return RawScheduleMeta(
        faculty=faculty,
        program=program,
        course=course,
        module=module,
        period_start_raw=p_start,
        period_end_raw=p_end,
    )


def parse_buildings(ws: Worksheet, max_row: int = 9) -> list[RawBuildingEntry]:
    seen: dict[str, str] = {}
    for row in ws.iter_rows(min_row=1, max_row=max_row):
        for cell in row:
            if isinstance(cell.value, str) and cell.value.strip().lower().startswith("корпус"):
                address = cell.value.strip()
                code_cell = ws.cell(row=cell.row, column=cell.column + 1)
                code = code_cell.value
                if isinstance(code, str) and code.strip():
                    seen[code.strip()] = address
    return [RawBuildingEntry(code=c, address=a) for c, a in seen.items()]


def _find_header_anchor(ws: Worksheet) -> Optional[int]:
    """Строка, где в столбце B находится 'День'."""
    for row in ws.iter_rows(min_col=2, max_col=2):
        cell = row[0]
        if isinstance(cell.value, str) and cell.value.strip() == "День":
            return cell.row
    return None


def _find_group_blocks(ws: Worksheet, merged: MergedIndex, header_row: int, first_data_row: int) -> list[RawGroupBlock]:
    blocks: list[RawGroupBlock] = []
    for row_idx in range(header_row, first_data_row):
        for col_idx in range(1, ws.max_column + 1):
            val = ws.cell(row=row_idx, column=col_idx).value
            if isinstance(val, str) and val.strip() == "Ауд.":
                room_col = col_idx
                subject_col = col_idx - 1
                building_col = col_idx + 1
                group_name_val = ws.cell(row=row_idx, column=subject_col).value
                if not isinstance(group_name_val, str) or not group_name_val.strip():
                    continue
                # Ищем метку потока/специализации: ближайшая непустая
                # ячейка в этом столбце (с учётом merge) выше текущей строки.
                stream_label = ""
                for r in range(row_idx - 1, header_row - 1, -1):
                    v = effective_value(ws, merged, r, subject_col)
                    if isinstance(v, str) and v.strip():
                        stream_label = v.strip()
                        break
                blocks.append(
                    RawGroupBlock(
                        group_name=group_name_val.strip(),
                        stream_label=stream_label,
                        subject_col=subject_col,
                        room_col=room_col,
                        building_col=building_col,
                    )
                )
    return blocks


def _find_day_rows(ws: Worksheet, first_data_row: int) -> list[tuple[str, int, int]]:
    """Возвращает список (day_raw, row_start, row_end) для каждого дня."""
    result = []
    for merged_range in sorted(ws.merged_cells.ranges, key=lambda m: m.min_row):
        if merged_range.min_col != 2:
            continue
        val = ws.cell(row=merged_range.min_row, column=2).value
        if isinstance(val, str) and val.strip().lower() in DAY_ABBREVIATIONS:
            if merged_range.min_row >= first_data_row:
                result.append((val.strip(), merged_range.min_row, merged_range.max_row))
    return result


def extract_raw_sheet(ws: Worksheet, faculty: str, program: str) -> RawSheet:
    meta = parse_metadata(ws, faculty, program)
    buildings = parse_buildings(ws)
    merged = MergedIndex(ws)

    header_row = _find_header_anchor(ws)
    raw = RawSheet(sheet_name=ws.title, meta=meta, buildings=buildings)
    if header_row is None:
        raw.structural_errors.append(
            "Не найдена опорная ячейка 'День' в столбце B — структура листа не распознана."
        )
        return raw

    # Первая строка данных = первая строка, где столбец C похож на "HH:MM-HH:MM".
    first_data_row = None
    for r in range(header_row + 1, ws.max_row + 1):
        v = ws.cell(row=r, column=3).value
        if isinstance(v, str) and TIME_RE.match(v.strip()):
            first_data_row = r
            break
    if first_data_row is None:
        raw.structural_errors.append(
            "Не найдена первая строка с временным интервалом в столбце C."
        )
        return raw

    blocks = _find_group_blocks(ws, merged, header_row, first_data_row)
    if not blocks:
        raw.structural_errors.append("Не найден ни один блок группы (по заголовку 'Ауд.').")
        return raw

    day_rows = _find_day_rows(ws, first_data_row)
    if not day_rows:
        raw.structural_errors.append("Не найден ни один день недели в столбце B.")
        return raw

    last_day_end_row = max(end for _, _, end in day_rows)

    for day_raw, row_start, row_end in day_rows:
        for r in range(row_start, row_end + 1):
            time_val = ws.cell(row=r, column=3).value
            if not (isinstance(time_val, str) and TIME_RE.match(time_val.strip())):
                continue
            start_time, end_time = [t.strip() for t in time_val.split("-", 1)]
            for block in blocks:
                # Пропускаем ячейки, если они — не top-left своего merge
                # (чтобы не читать пустой "хвост" объединённой ячейки).
                if not merged.is_top_left(r, block.subject_col):
                    tr, tc = merged.top_left_of(r, block.subject_col)
                    if (tr, tc) == (r, block.subject_col):
                        pass
                subject_text = effective_value(ws, merged, r, block.subject_col)
                room_text = effective_value(ws, merged, r, block.room_col)
                building_text = effective_value(ws, merged, r, block.building_col)
                if subject_text is None:
                    continue
                coord = ws.cell(row=r, column=block.subject_col).coordinate
                raw.cells.append(
                    RawCell(
                        group_name=block.group_name,
                        stream_label=block.stream_label,
                        day_raw=day_raw,
                        start_time=start_time,
                        end_time=end_time,
                        subject_text=subject_text,
                        room_text=room_text if isinstance(room_text, str) else (
                            str(room_text) if room_text is not None else None
                        ),
                        building_text=building_text if isinstance(building_text, str) else (
                            str(building_text) if building_text is not None else None
                        ),
                        coordinate=coord,
                    )
                )

    # "Подвальные" заметки ниже последнего дня — общие примечания уровня
    # листа (напр. про физкультуру), не привязанные к конкретному слоту.
    seen_notes: set[str] = set()
    for r in range(last_day_end_row + 1, ws.max_row + 1):
        for c in range(1, ws.max_column + 1):
            if not merged.is_top_left(r, c):
                continue
            v = ws.cell(row=r, column=c).value
            if isinstance(v, str) and v.strip() and v.strip() not in seen_notes:
                seen_notes.add(v.strip())
                raw.sheet_notes.append(v.strip())

    return raw
