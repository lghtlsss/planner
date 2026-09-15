"""
Два независимых пути получения данных (см. ANALYSIS.md, раздел
"Источники" и "Google Sheets API"):

- локальный xlsx-файл -> core/parser.py (openpyxl) — как и раньше;
- ссылка на Google Таблицу -> core/gsheets_api.py (Google Sheets API v4),
  это ПРИОРИТЕТНЫЙ способ для ссылок: он не скачивает файл целиком,
  а читает уже готовые значения ячеек через API, что быстрее и
  устойчивее к таймаутам, которые бывают у xlsx-экспорта Google.
  Требует API-ключ (--api-key или переменная окружения
  GOOGLE_SHEETS_API_KEY). Если ключа нет — используется резервный
  способ через core/source.py (полная выгрузка xlsx), с явным
  предупреждением, что это медленнее.
- любая другая ссылка (Яндекс.Диск, прямая ссылка на файл) -> тоже
  core/source.py, т.к. это не Google Таблицы и Sheets API тут не
  применим в принципе.

Оба пути сходятся в одной и той же точке: core/parser.RawSheet ->
build_schedule_from_raw() -> core/normalizer.normalize_cell() -> JSON.
Ни core/parser.py, ни core/normalizer.py при этом не меняются.

Использование:
    python main.py путь/к/файлу.xlsx/ссылка --api-key key(для ссылки) \
        [--sheets "1 курс,2 курс"](по умолчанию все) [--out result.json](куда записывать результат)
    python main.py путь/к/файлу.xlsx [--sheets "1 курс,2 курс"] [--out result.json]
    python main.py "https://docs.google.com/spreadsheets/d/.../edit?usp=drive_link" \
        --api-key AIzaSyBk12_cvPOZgM8fVVbuBsFDuadzYoO640A --out result.json

Примеры:
python main.py "1 модуль - Ф-т ИМиКН - БАК Компьютерные науки и технологии.xlsx" --out schedule.json
python main.py "1 модуль - Ф-т ИМиКН - БАК Компьютерные науки и технологии.xlsx" --sheets "1 курс,2 курс" --out schedule12.json
python main.py "https://docs.google.com/spreadsheets/d/1GyQ6IklpcoT7Sir6C7rNU9aNErDX1HWBg7Y1EK5T-nA/edit?gid=739453176" --api-key AIzaSyBk12_cvPOZgM8fVVbuBsFDuadzYoO640A --out scheduleU.json
python main.py "https://docs.google.com/spreadsheets/d/1GyQ6IklpcoT7Sir6C7rNU9aNErDX1HWBg7Y1EK5T-nA/edit?gid=739453176" --api-key AIzaSyBk12_cvPOZgM8fVVbuBsFDuadzYoO640A --sheets "1 курс" --out scheduleU2.json

python main.py "https://disk.360.yandex.ru/i/-H0wJzND567qmw" --out schedule.json
"""


from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

from core.gsheets_api import GoogleSheetsAPIError, build_raw_sheets_from_api
from core.models import (
    Building,
    Group,
    ParsedSchedule,
    ParseWarning,
    ScheduleMetadata,
    WarningSeverity,
)
from core.normalizer import normalize_cell, resolve_year
from core.parser import RawSheet, extract_raw_sheet, load_workbook_resilient
from core.source import GOOGLE_SHEETS_RE, ScheduleSourceError, resolve_source
from core.validators import validate_schedule

FACULTY = "ИМиКН"
PROGRAM = 'БАК "Компьютерные науки и технологии"'

YEAR_RE = re.compile(r"(\d{4})\s*-\s*\d{4}\s*учебный год", re.IGNORECASE)
API_KEY_ENV_VAR = "GOOGLE_SHEETS_API_KEY"


def detect_academic_year_start_from_workbook(wb) -> tuple[int | None, list[ParseWarning]]:
    """Используется только в xlsx-пути (локальный файл / резервная
    выгрузка). В API-пути год определяется внутри
    core.gsheets_api.build_raw_sheets_from_api — там для этого не
    приходится вычитывать лист "Календарь" целиком."""
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        for row in ws.iter_rows(max_row=3):
            for cell in row:
                if isinstance(cell.value, str):
                    m = YEAR_RE.search(cell.value)
                    if m:
                        return int(m.group(1)), []
    return None, [
        ParseWarning(
            severity=WarningSeverity.WARNING,
            message="Не удалось определить учебный год из листа 'Календарь' — год дат может быть неверным.",
        )
    ]


def build_schedule_from_raw(raw: RawSheet, academic_year_start: int) -> ParsedSchedule:
    """Единая точка сборки ParsedSchedule из уже извлечённой структуры
    (RawSheet) — общая для xlsx-пути и API-пути, дальше они ничем не
    отличаются."""
    warnings: list[ParseWarning] = []
    for err in raw.structural_errors:
        warnings.append(ParseWarning(severity=WarningSeverity.CRITICAL, message=err, location=raw.sheet_name))

    buildings = {b.code: Building(code=b.code, address=b.address) for b in raw.buildings}

    groups: dict[str, Group] = {}
    lessons = []
    notes = []

    for cell in raw.cells:
        if cell.group_name not in groups:
            groups[cell.group_name] = Group(
                name=cell.group_name,
                program=PROGRAM,
                faculty=FACULTY,
                course=raw.meta.course or 0,
                stream_label=cell.stream_label,
            )
        cell_lessons, cell_notes, cell_warnings = normalize_cell(cell, academic_year_start)
        lessons.extend(cell_lessons)
        notes.extend(cell_notes)
        warnings.extend(cell_warnings)

    for note_text in raw.sheet_notes:
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.INFO,
                message="Общая заметка уровня листа (не привязана к конкретному занятию).",
                location=raw.sheet_name,
                raw_value=note_text,
            )
        )

    period_start = period_end = None
    if raw.meta.period_start_raw and raw.meta.period_end_raw:
        try:
            d1, m1 = (int(x) for x in raw.meta.period_start_raw.rstrip(".").split("."))
            d2, m2 = (int(x) for x in raw.meta.period_end_raw.rstrip(".").split("."))
            period_start = date(resolve_year(m1, academic_year_start), m1, d1)
            period_end = date(resolve_year(m2, academic_year_start), m2, d2)
        except (ValueError, AttributeError):
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.WARNING,
                    message="Не удалось разобрать даты периода модуля.",
                    location=raw.sheet_name,
                )
            )

    metadata = ScheduleMetadata(
        faculty=FACULTY,
        program=PROGRAM,
        course=raw.meta.course or 0,
        module=raw.meta.module or 0,
        period_start=period_start,
        period_end=period_end,
        sheet_name=raw.sheet_name,
    )

    schedule = ParsedSchedule(
        metadata=metadata,
        buildings=buildings,
        groups=groups,
        lessons=lessons,
        notes=notes,
        warnings=warnings,
    )
    schedule.warnings = validate_schedule(schedule)
    return schedule


def _print_summary(sheet_name: str, schedule: ParsedSchedule) -> None:
    n_critical = sum(1 for w in schedule.warnings if w.severity == WarningSeverity.CRITICAL)
    n_error = sum(1 for w in schedule.warnings if w.severity == WarningSeverity.ERROR)
    n_warning = sum(1 for w in schedule.warnings if w.severity == WarningSeverity.WARNING)
    print(
        f"[{sheet_name}] группы={len(schedule.groups)} занятия={len(schedule.lessons)} "
        f"заметки={len(schedule.notes)} critical={n_critical} error={n_error} warning={n_warning}"
    )


# ---------------------------------------------------------------------------
# Путь через Google Sheets API (приоритетный для ссылок на Google Таблицы)
# ---------------------------------------------------------------------------


def run_via_google_api(spreadsheet_id: str, api_key: str, sheets_filter: str | None) -> tuple[dict, bool]:
    raw_sheets, academic_year_start = build_raw_sheets_from_api(
        spreadsheet_id=spreadsheet_id,
        api_key=api_key,
        faculty=FACULTY,
        program=PROGRAM,
        sheet_filter_regex=sheets_filter or "курс",
    )

    year_warning = []
    if academic_year_start is None:
        print("ПРЕДУПРЕЖДЕНИЕ: не удалось определить учебный год, использую текущий год.", file=sys.stderr)
        academic_year_start = date.today().year
        year_warning = [
            ParseWarning(
                severity=WarningSeverity.WARNING,
                message="Не удалось определить учебный год из листа 'Календарь' — год дат может быть неверным.",
            )
        ]

    results = {}
    any_critical = False
    for raw in raw_sheets:
        schedule = build_schedule_from_raw(raw, academic_year_start)
        schedule.warnings = year_warning + schedule.warnings
        _print_summary(raw.sheet_name, schedule)
        if any(w.severity == WarningSeverity.CRITICAL for w in schedule.warnings):
            any_critical = True
        results[raw.sheet_name] = schedule.to_dict()

    return results, any_critical


# ---------------------------------------------------------------------------
# Путь через xlsx (локальный файл или резервная сетевая выгрузка)
# ---------------------------------------------------------------------------


def run_via_xlsx(user_input: str, sheets_filter: str | None) -> tuple[dict, bool]:
    try:
        source = resolve_source(user_input)
    except ScheduleSourceError as exc:
        print(f"ОШИБКА: {exc}", file=sys.stderr)
        raise SystemExit(2)

    try:
        raw_file = source.fetch()
    except ScheduleSourceError as exc:
        print(f"ОШИБКА: не удалось получить файл: {exc}", file=sys.stderr)
        raise SystemExit(2)

    print(f"Источник (xlsx): {raw_file.origin} (sha256={raw_file.content_hash[:12]}...)")

    try:
        wb = load_workbook_resilient(raw_file.path)
    finally:
        raw_file.cleanup()

    academic_year_start, year_warnings = detect_academic_year_start_from_workbook(wb)
    if academic_year_start is None:
        print("ПРЕДУПРЕЖДЕНИЕ: не удалось определить учебный год, использую текущий год.", file=sys.stderr)
        academic_year_start = date.today().year

    if sheets_filter and "," in sheets_filter:
        sheet_names = [s.strip() for s in sheets_filter.split(",")]
    elif sheets_filter:
        sheet_names = [s for s in wb.sheetnames if re.search(sheets_filter, s, re.IGNORECASE)]
    else:
        sheet_names = [s for s in wb.sheetnames if re.search(r"курс", s, re.IGNORECASE)]

    results = {}
    any_critical = False
    for sheet_name in sheet_names:
        if sheet_name not in wb.sheetnames:
            print(f"ПРЕДУПРЕЖДЕНИЕ: лист '{sheet_name}' не найден, пропускаю.", file=sys.stderr)
            continue
        ws = wb[sheet_name]
        raw = extract_raw_sheet(ws, faculty=FACULTY, program=PROGRAM)
        schedule = build_schedule_from_raw(raw, academic_year_start)
        schedule.warnings = year_warnings + schedule.warnings
        _print_summary(sheet_name, schedule)
        if any(w.severity == WarningSeverity.CRITICAL for w in schedule.warnings):
            any_critical = True
        results[sheet_name] = schedule.to_dict()

    return results, any_critical


def main() -> int:
    parser = argparse.ArgumentParser(description="Parser расписания НИУ ВШЭ (Этап 1)")
    parser.add_argument(
        "source",
        help=(
            "Путь к xlsx-файлу расписания, ссылка на Google Таблицу "
            "(доступную 'по ссылке') или публичная ссылка на Яндекс.Диск"
        ),
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get(API_KEY_ENV_VAR),
        help=(
            "API-ключ Google Sheets API (иначе берётся из переменной окружения "
            f"{API_KEY_ENV_VAR}). Используется только для ссылок на Google Таблицы; "
            "без ключа для них применяется резервный способ через xlsx-экспорт."
        ),
    )
    parser.add_argument(
        "--force-xlsx",
        action="store_true",
        help="Даже для ссылки на Google Таблицу использовать xlsx-экспорт, а не API.",
    )
    parser.add_argument("--sheets", help="Список листов через запятую, либо regex-фильтр (по умолчанию — все листы с курсами)")
    parser.add_argument("--out", default="schedule.json", help="Куда сохранить JSON-результат")
    args = parser.parse_args()

    google_match = GOOGLE_SHEETS_RE.search(args.source)

    if google_match and not args.force_xlsx:
        if args.api_key:
            print("Способ получения данных: Google Sheets API.")
            try:
                results, any_critical = run_via_google_api(google_match.group(1), args.api_key, args.sheets)
            except GoogleSheetsAPIError as exc:
                print(f"ОШИБКА Google Sheets API: {exc}", file=sys.stderr)
                return 2
        else:
            print(
                f"Нет API-ключа ({API_KEY_ENV_VAR} / --api-key не заданы) — "
                "использую резервный способ (полная выгрузка xlsx). Это медленнее "
                "и может упираться в таймаут на скачивании сгенерированного файла; "
                "для надёжности рекомендуется получить API-ключ (см. ANALYSIS.md).",
                file=sys.stderr,
            )
            results, any_critical = run_via_xlsx(args.source, args.sheets)
    else:
        results, any_critical = run_via_xlsx(args.source, args.sheets)

    out_path = Path(args.out)
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Результат сохранён в {out_path}")

    if any_critical:
        print(
            "ВНИМАНИЕ: обнаружены критические ошибки валидации — это расписание "
            "нельзя публиковать как рабочее (см. поле warnings в JSON).",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
