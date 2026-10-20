"""
Normalizer — превращает "сырую" ячейку (RawCell) в Lesson / ScheduleNote
плюс список предупреждений. Общий для всех путей получения данных
(openpyxl-файл и Google Sheets API).

Расписания разных факультетов написаны разными "диалектами" текста.
Вместо жёсткого шаблона "даты Предмет - тип - [код] - Преподаватель"
разбор строится на извлечении сущностей по признакам, а не по позициям:

- даты: `7.09`, `07.09.`, `8.09-20.10`, `с 14.09.`, `с 07.09 по 05.10, 19.10`,
  списки через запятую / "и" / двойную точку; отмены: `16.09 - отмена`,
  `15.09, 22.09 отм.`, `... 15.09 отм.` в конце строки;
- преподаватель: "Фамилия И.О." (одна/две буквы инициала, несколько через
  запятую), "Вакансия", либо "Фамилия Имя" как последний сегмент;
- тип занятия: слово-тип после дефиса (`-лекция-`, `- семинар`) или в
  начале следующей строки (`7.09 лекция`); дефисы могут быть без пробелов;
- код потока `26_27_М_ОРГ_Г_1115950_10`, подгруппа `гр.1` / `группа 1`;
- флаги `online`, `МКД`; аудитория внутри текста (`323 ауд.`) только
  фиксируется в предупреждении;
- расположение дат: перед предметом (`даты\\nПредмет - тип\\nФИО`), в начале
  строки, либо ПОСЛЕ предмета отдельными строками, у каждой своя
  пара "даты — преподаватель/тип" (тогда одна запись даёт несколько занятий).

Принцип прежний: единичная "непонятная" ячейка не роняет импорт — всё, что
не удалось разобрать, уходит в warnings, а полный raw_text сохраняется.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from .models import (
    DateRule,
    DateRuleType,
    DayOfWeek,
    Lesson,
    ParseWarning,
    RAW_DAY_MAP,
    ScheduleNote,
    TimeOverride,
    WarningSeverity,
)
from .parser import RawCell

# ---------------------------------------------------------------------------
# Регулярки
# ---------------------------------------------------------------------------

DATE_TOKEN_RE = re.compile(r"(\d{1,2})\.(\d{1,2})")

OVERRIDE_ONLY_RE = re.compile(
    r"^(\d{1,2}\.\d{1,2})\.?\s+в\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*$",
    re.IGNORECASE,
)
OVERRIDE_LEADING_RE = re.compile(
    r"^(\d{1,2}\.\d{1,2})\.?\s+в\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)$",
    re.IGNORECASE | re.DOTALL,
)

# Один элемент перечня дат: [с] дд.мм[.гггг] [(-|по) дд.мм] [- отмена|отм.] [разделитель]
_DATE_ITEM_RE = re.compile(
    r"\s*"
    r"(?P<since>[сc]\s+)?"
    r"(?P<d1>\d{1,2})\.(?P<m1>\d{1,2})(?:\.\d{4})?\.?"
    r"(?:\s*(?:[-–]|по)\s*(?P<d2>\d{1,2})\.(?P<m2>\d{1,2})(?:\.\d{4})?\.?)?"
    r"(?P<cancel>\s*[-–]?\s*(?:отмена(?:\s+занятия)?|отм\b\.?))?"
    r"\s*(?:,|;|\bи\b|\.)?",
    re.IGNORECASE,
)

_TRAILING_CANCEL_RE = re.compile(
    r"(?<![\d.])(?P<dates>\d{1,2}\.\d{1,2}(?:[\s,;.]+(?:и\s+)?\d{1,2}\.\d{1,2})*)"
    r"\.?\s*[-–]?\s*(?:отмена(?:\s+занятия)?|отм\b\.?)\s*$",
    re.IGNORECASE,
)

_NAME = (
    r"[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?[ \t]+[А-ЯЁ]\.[ \t]?"
    r"(?:[А-ЯЁ](?:\.|(?![А-Яа-яЁё])))?"
)
_TEACHER_RE = re.compile(
    rf"(?P<t>{_NAME}(?:\s*(?:,|;|/|\bи\b)\s*{_NAME})*|\b[Вв]акансия\b)"
    rf"(?P<tag>\s*[А-ЯЁ]{{1,3}}(?![А-Яа-яЁёA-Za-z0-9_]))?"
)
# "Лобанов Павел" / "Мизонова В.Г." как последний сегмент строки
TEACHER_NAME_RE = re.compile(
    r"^[А-ЯЁ][а-яё\-]+\s+(?:[А-ЯЁ][а-яё]+|[А-ЯЁ]\.\s?[А-ЯЁ]?\.?)$"
)

_TYPE_WORDS = (
    r"(?:лекци[яи]|семинар(?:ы)?|практик[аи]|практическ(?:ое|ие)\s+занятия?|"
    r"лабораторн(?:ая|ые)(?:\s+работ[аы])?|консультаци[яи]|вводное\s+занятие|"
    r"зач[её]т|экзамен|коллоквиум|контрольная(?:\s+работа)?|тренинг|мастер-класс)"
)
_TYPE_SUFFIX = r"(?:\s*\(\d+\))?"
_TYPE_DASH_RE = re.compile(
    rf"[-–—]\s*(?P<type>{_TYPE_WORDS}{_TYPE_SUFFIX})(?![А-Яа-яЁё])", re.IGNORECASE
)
_TYPE_LINE_RE = re.compile(
    rf"^\s*(?P<type>{_TYPE_WORDS}{_TYPE_SUFFIX})(?![А-Яа-яЁё])", re.IGNORECASE
)

_ONLINE_RE = re.compile(r"(?<![\w-])(?:online|онлайн)(?![\w-])", re.IGNORECASE)
_ROOM_HINT_RE = re.compile(
    r"(?<![\w.])(\d{1,4}[А-Яа-яA-Za-z]?)\s*ауд(?:итория)?\.?[,.]*", re.IGNORECASE
)
_CODE_RE = re.compile(r"(?<!\S)(?=\w*\d)\w+(?:_\w+)+(?=[\s,.;]|$)")
_SUBGROUP_RE = re.compile(r"(?<![\w])(?:гр\.?|группа)\s*(\d+)", re.IGNORECASE)
_MKD_RE = re.compile(r"(?<![\w-])МКД(?![\w-])")
_DASH_LINE_RE = re.compile(r"(?m)^[ \t]*[-–—_=]{3,}[ \t]*$")

NOTE_KEYWORDS_RE = re.compile(
    r"проводятся по расписанию дисциплин|согласно расписанию секций|"
    r"занятия по дисциплин|военная кафедра",
    re.IGNORECASE,
)

BUILDING_ALIASES = {"бпокр": "БПок"}


# ---------------------------------------------------------------------------
# Даты
# ---------------------------------------------------------------------------

def resolve_year(month: int, academic_year_start: int) -> int:
    """Учебный год начинается в сентябре: месяцы сен-дек относятся к
    стартовому году, янв-авг — к следующему календарному году."""
    return academic_year_start if month >= 9 else academic_year_start + 1

def _make_date(day: int, month: int, academic_year_start: int) -> Optional[date]:
    try:
        return date(resolve_year(month, academic_year_start), month, day)
    except ValueError:
        return None

@dataclass
class _DateScan:
    rule: DateRule
    remainder: str
    warnings: list[str]
    all_cancelled: bool

def _scan_dates(text: str, y: int, allow_empty_remainder: bool = False) -> Optional[_DateScan]:
    """Разбирает перечень дат в начале text. None — если дат нет (или
    после них ничего не осталось, а allow_empty_remainder=False)."""
    pos = 0
    items = []
    while True:
        m = _DATE_ITEM_RE.match(text, pos)
        if not m or m.end() == pos:
            break
        items.append(m)
        pos = m.end()
    if not items:
        return None

    remainder = re.sub(r"^[\s,;:\-–—]+", "", text[pos:])
    if not remainder.strip() and not allow_empty_remainder:
        return None

    flags = [bool(m.group("cancel")) for m in items]
    # "10.09, 24.09 и 22.10 - отмена": маркер в конце ряда относится ко всему ряду,
    # а "02.09, 16.09 - отмена, 30.09": маркер в середине — только к своей дате.
    if len(items) > 1 and flags[-1]:
        flags = [True] * len(items)

    warns: list[str] = []
    singles: list[date] = []
    ranges: list[tuple[date, Optional[date]]] = []
    excluded: list[date] = []

    for m, cancelled in zip(items, flags):
        d1 = _make_date(int(m.group("d1")), int(m.group("m1")), y)
        if d1 is None:
            warns.append(f"некорректная дата '{m.group(0).strip()}'")
            continue
        if m.group("d2"):
            d2 = _make_date(int(m.group("d2")), int(m.group("m2")), y)
            if cancelled:
                excluded.append(d1)
                if d2:
                    excluded.append(d2)
            else:
                ranges.append((d1, d2))
        elif m.group("since"):
            if cancelled:
                excluded.append(d1)
            else:
                ranges.append((d1, None))  # "с 14.09." — до конца периода
        else:
            singles.append(d1)
            if cancelled:
                excluded.append(d1)

    raw = text[:pos].strip()
    active_exists = any(not c for c in flags)

    if not active_exists:
        rule = DateRule(type=DateRuleType.WHOLE_PERIOD, raw=raw, excluded_dates=excluded)
    elif ranges:
        start, end = ranges[0]
        # к диапазону могут добавляться отдельные даты: "с 07.09 по 05.10, 19.10"
        rule = DateRule(
            type=DateRuleType.RANGE, start_date=start, end_date=end,
            dates=singles, raw=raw, excluded_dates=excluded,
        )
        if len(ranges) > 1:
            warns.append("несколько диапазонов дат в одной записи — учтён только первый (см. raw_text)")
    elif singles:
        rule = DateRule(
            type=DateRuleType.SINGLE if len(singles) == 1 else DateRuleType.LIST,
            dates=singles, raw=raw, excluded_dates=excluded,
        )
    else:
        rule = DateRule(type=DateRuleType.WHOLE_PERIOD, raw=raw, excluded_dates=excluded)

    return _DateScan(rule=rule, remainder=remainder, warnings=warns, all_cancelled=not active_exists)

def parse_date_rule(text: str, academic_year_start: int) -> tuple[DateRule, str]:
    scan = _scan_dates(text, academic_year_start)
    if scan is None:
        return DateRule(type=DateRuleType.WHOLE_PERIOD), text
    return scan.rule, scan.remainder

def _strip_trailing_cancel(text: str, y: int) -> tuple[str, list[date]]:
    """'... Преподаватель 15.09 отм.' -> (текст без хвоста, [15.09])."""
    m = _TRAILING_CANCEL_RE.search(text)
    if not m:
        return text, []
    ds = []
    for d, mo in DATE_TOKEN_RE.findall(m.group("dates")):
        dt = _make_date(int(d), int(mo), y)
        if dt:
            ds.append(dt)
    return text[: m.start()].rstrip(), ds


# ---------------------------------------------------------------------------
# Разбор текста одного занятия
# ---------------------------------------------------------------------------

def _cut(t: str, m: re.Match) -> str:
    return t[: m.start()] + " " + t[m.end():]

def _clean_subject(s: str) -> Optional[str]:
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"(?:\s*[-–—]\s*){2,}", " - ", s)
    s = s.strip(" -–—,;:")
    s = re.sub(r"\(\s*\)", "", s).strip()
    return s or None

def _extract_fields(text: str, *, continuation: bool) -> dict:
    """Достаёт из текста преподавателя, код потока, подгруппу, тип, флаги;
    остаток считается названием дисциплины.

    continuation=True — текст является продолжением (строка с датами после
    названия), тип там допустим и в самом начале строки."""
    infos: list[str] = []
    t = text.replace("\xa0", " ")

    online = bool(_ONLINE_RE.search(t))
    if online:
        t = _ONLINE_RE.sub(" ", t)

    m = _ROOM_HINT_RE.search(t)
    if m:
        infos.append(f"в тексте указана аудитория '{m.group(1)}' (в данные не перенесена, см. raw_text)")
        t = re.sub(r",\s*,", ",", _cut(t, m))

    stream_group = None
    m = _CODE_RE.search(t)
    if m:
        stream_group = m.group(0)
        t = _cut(t, m)

    subgroup = None
    m = _SUBGROUP_RE.search(t)
    if m:
        subgroup = f"группа {m.group(1)}"
        t = _cut(t, m)

    teacher = None
    ms = list(_TEACHER_RE.finditer(t))
    if ms:
        m = ms[-1]
        teacher = m.group("t").strip()
        t = _cut(t, m)

    if teacher is None:
        segs = [
            p.strip()
            for line in t.split("\n")
            for p in re.split(r"\s[-–—]\s", line)
            if p.strip()
        ]
        if len(segs) >= (1 if continuation else 2) and TEACHER_NAME_RE.match(segs[-1]):
            teacher = segs[-1]
            idx = t.rfind(segs[-1])
            t = t[:idx] + " " + t[idx + len(segs[-1]):]

    lesson_type = None
    lines = t.split("\n")
    for i, line in enumerate(lines):
        if lesson_type is not None:
            break
        m = _TYPE_DASH_RE.search(line)
        pre = post = None
        if m:
            pre, post = line[: m.start()], line[m.end():]
        elif i > 0 or continuation:
            m = _TYPE_LINE_RE.match(line)
            if m:
                pre, post = "", line[m.end():]
        if m:
            lesson_type = re.sub(r"\s+", " ", m.group("type")).strip().lower()
            post = _MKD_RE.sub(" ", post)
            if re.search(r"[A-Za-zА-Яа-яЁё0-9]", post):
                infos.append(f"после типа занятия остался текст '{post.strip()}' (в данные не перенесён)")
            lines[i] = pre

    subject = _clean_subject(" ".join(lines))
    return dict(
        subject=subject, lesson_type=lesson_type, teacher=teacher,
        stream_group=stream_group, subgroup=subgroup, online=online, infos=infos,
    )

@dataclass
class _Entry:
    subject: Optional[str]
    lesson_type: Optional[str]
    teacher: Optional[str]
    stream_group: Optional[str]
    subgroup: Optional[str]
    dates: DateRule
    online: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    time_overrides: list[TimeOverride] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    infos: list[str] = field(default_factory=list)

def _completeness_warnings(e: _Entry) -> list[str]:
    if e.subject is None:
        return ["не удалось выделить название дисциплины"]
    if e.lesson_type is None and e.teacher is None:
        return ["не удалось определить тип занятия и преподавателя"]
    if e.lesson_type is None:
        return ["не удалось определить тип занятия"]
    if e.teacher is None:
        return ["не удалось определить преподавателя"]
    return []

def _single_entry(text: str, rule: DateRule) -> _Entry:
    f = _extract_fields(text, continuation=False)
    e = _Entry(
        subject=f["subject"], lesson_type=f["lesson_type"], teacher=f["teacher"],
        stream_group=f["stream_group"], subgroup=f["subgroup"], dates=rule,
        online=f["online"], infos=list(f["infos"]),
    )
    e.warnings = _completeness_warnings(e)
    return e

def _parse_subject_first(lines: list[str], y: int) -> list[_Entry]:
    """Диалект "название, затем строки с датами":
        Предмет Преподаватель (или "Предмет-лекция-")
        7.09 лекция
        14.09-19.10 семинар гр.1
    Каждая строка с датами — отдельное занятие; недостающее (тип,
    преподаватель) берётся из строки с названием."""
    head = _extract_fields(lines[0], continuation=False)
    entries: list[_Entry] = []
    block_excluded: list[date] = []
    extra_warnings: list[str] = []

    for raw_line in lines[1:]:
        ln = raw_line.strip()
        if not ln:
            continue
        scan = _scan_dates(ln, y, allow_empty_remainder=True)
        if scan is None:
            extra_warnings.append(f"не распознана строка '{ln}'")
            continue
        rem, tex = _strip_trailing_cancel(scan.remainder, y)
        scan.rule.excluded_dates.extend(tex)

        if not rem.strip():
            if scan.all_cancelled:
                block_excluded.extend(scan.rule.excluded_dates)
                continue
            f = dict(subject=None, lesson_type=None, teacher=None, stream_group=None,
                     subgroup=None, online=False, infos=[])
        else:
            f = _extract_fields(rem, continuation=True)

        e = _Entry(
            subject=head["subject"],
            lesson_type=f["lesson_type"] or head["lesson_type"],
            teacher=f["teacher"] or head["teacher"],
            stream_group=f["stream_group"] or head["stream_group"],
            subgroup=f["subgroup"] or head["subgroup"],
            dates=scan.rule,
            online=head["online"] or f["online"],
            infos=list(head["infos"]) + list(f["infos"]),
        )
        if f["subject"]:
            e.infos.append(f"в строке с датами остался текст '{f['subject']}' (в данные не перенесён)")
        e.warnings = _completeness_warnings(e) + [w for w in scan.warnings]
        entries.append(e)

    if not entries:
        e = _Entry(
            subject=head["subject"], lesson_type=head["lesson_type"], teacher=head["teacher"],
            stream_group=head["stream_group"], subgroup=head["subgroup"],
            dates=DateRule(type=DateRuleType.WHOLE_PERIOD), online=head["online"],
            infos=list(head["infos"]),
        )
        e.warnings = _completeness_warnings(e)
        entries.append(e)

    for e in entries:
        e.dates.excluded_dates.extend(block_excluded)
        e.warnings.extend(extra_warnings)
    return entries

def _parse_block(block: str, y: int) -> list[_Entry]:
    """Один блок ячейки (занятия, разделённые пустой строкой / строкой из
    дефисов, — отдельные блоки) -> одно или несколько занятий."""
    lines = [l.rstrip() for l in block.strip().split("\n")]
    overrides: list[TimeOverride] = []
    excluded: list[date] = []
    pre_warnings: list[str] = []

    # Служебные строки в конце блока: "06.10. в 09:30-10:10" и "07.09. - отмена занятия"
    while len([l for l in lines if l.strip()]) > 1:
        while lines and not lines[-1].strip():
            lines.pop()
        last = lines[-1].strip()
        m = OVERRIDE_ONLY_RE.match(last)
        if m:
            dd, mm = (int(x) for x in m.group(1).split("."))
            od = _make_date(dd, mm, y)
            if od:
                overrides.append(TimeOverride(on_date=od, start_time=m.group(2), end_time=m.group(3)))
            else:
                pre_warnings.append(f"не удалось разобрать дату в исключении по времени: '{m.group(1)}'")
            lines.pop()
            continue
        scan = _scan_dates(last, y, allow_empty_remainder=True)
        if scan and not scan.remainder.strip() and scan.all_cancelled:
            excluded.extend(scan.rule.excluded_dates)
            lines.pop()
            continue
        break

    text = "\n".join(lines).strip()
    entries: list[_Entry]

    lm = OVERRIDE_LEADING_RE.match(text)
    if lm:
        dd, mm = (int(x) for x in lm.group(1).split("."))
        od = _make_date(dd, mm, y)
        rule = DateRule(type=DateRuleType.SINGLE, dates=[od] if od else [], raw=lm.group(1))
        e = _single_entry(lm.group(4), rule)
        e.start_time, e.end_time = lm.group(2), lm.group(3)
        entries = [e]
    else:
        scan = _scan_dates(text, y)
        if scan:
            rem, tex = _strip_trailing_cancel(scan.remainder, y)
            scan.rule.excluded_dates.extend(tex)
            e = _single_entry(rem, scan.rule)
            e.warnings.extend(scan.warnings)
            entries = [e]
        else:
            all_lines = text.split("\n")
            rest = [l for l in all_lines[1:] if l.strip()]
            if rest and any(_scan_dates(l.strip(), y, True) for l in rest):
                entries = _parse_subject_first(all_lines, y)
            else:
                rem, tex = _strip_trailing_cancel(text, y)
                entries = [_single_entry(rem, DateRule(type=DateRuleType.WHOLE_PERIOD, excluded_dates=tex))]

    for e in entries:
        e.dates.excluded_dates.extend(excluded)
        e.time_overrides = list(overrides)
        e.warnings.extend(pre_warnings)
    return entries


# ---------------------------------------------------------------------------
# Аудитория / корпус
# ---------------------------------------------------------------------------

def _strip_dash_lines(s: str) -> str:
    return _DASH_LINE_RE.sub("", s)

def _split_stacked(value) -> list[str]:
    """'107\\n\\n\\n108' -> ['107', '108'] (по одному значению на блок занятий)."""
    if value is None:
        return []
    s = _strip_dash_lines(str(value).replace("\xa0", " "))
    return [p.strip() for p in re.split(r"\n\s*\n", s) if p.strip()]

def _pick(parts: list[str], idx: int, n_blocks: int) -> tuple[Optional[str], bool]:
    """(значение для блока idx, было ли несоответствие количества)."""
    if not parts:
        return None, False
    if len(parts) == 1:
        return parts[0], False
    if len(parts) == n_blocks:
        return parts[idx], False
    return " / ".join(parts), True

def normalize_room_building(room_text: Optional[str], building_text: Optional[str]) -> tuple[Optional[str], Optional[str], bool]:
    """-> (room, building, online). "online"/"онлайн" в любом из полей
    (в т.ч. "online\\nасинхронно") означает онлайн-занятие."""
    def clean(v) -> Optional[str]:
        if v is None:
            return None
        s = _strip_dash_lines(str(v).replace("\xa0", " "))
        s = " ".join(l.strip() for l in s.split("\n") if l.strip())
        return s or None

    room = clean(room_text)
    building = clean(building_text)

    for v in (room, building):
        if v and _ONLINE_RE.search(v):
            return None, None, True

    if room in ("-", "—", "–"):
        room = None
    if room:
        room = re.sub(r"^(\d+)\.0$", r"\1", room)
    if building:
        building = BUILDING_ALIASES.get(building.lower(), building)
    return room, building, False


# ---------------------------------------------------------------------------
# Точка входа
# ---------------------------------------------------------------------------

def normalize_cell(
    raw: RawCell,
    academic_year_start: int,
    day_map: dict[str, DayOfWeek] = RAW_DAY_MAP,
) -> tuple[list[Lesson], list[ScheduleNote], list[ParseWarning]]:
    lessons: list[Lesson] = []
    notes: list[ScheduleNote] = []
    warnings: list[ParseWarning] = []

    def warn(sev: WarningSeverity, msg: str, raw_value: Optional[str] = None) -> None:
        warnings.append(ParseWarning(severity=sev, message=msg, location=raw.coordinate, raw_value=raw_value))

    day = day_map.get(raw.day_raw.strip().lower().rstrip("."))
    if day is None:
        warn(WarningSeverity.ERROR, f"Неизвестное обозначение дня недели: '{raw.day_raw}'", raw.day_raw)
        return lessons, notes, warnings

    if raw.subject_text is None:
        return lessons, notes, warnings
    text = raw.subject_text if isinstance(raw.subject_text, str) else str(raw.subject_text)
    text = text.replace("\r", "").strip()
    if not text:
        return lessons, notes, warnings

    if NOTE_KEYWORDS_RE.search(text):
        notes.append(
            ScheduleNote(
                group=raw.group_name, day_of_week=day, start_time=raw.start_time,
                end_time=raw.end_time, text=text, source_cell=raw.coordinate,
            )
        )
        return lessons, notes, warnings

    blocks = [b for b in re.split(r"\n\s*\n", _strip_dash_lines(text)) if b.strip()]
    if not blocks:
        return lessons, notes, warnings

    room_parts = _split_stacked(raw.room_text)
    building_parts = _split_stacked(raw.building_text)
    mismatch_reported = False
    prev_block_lessons: list[Lesson] = []

    for idx, block in enumerate(blocks):
        # Блок из одной строки "06.10. в 09:30-10:10" — исключение по времени
        # для занятия из предыдущего блока этой же ячейки.
        om = OVERRIDE_ONLY_RE.match(block.strip())
        if om:
            dd, mm = (int(x) for x in om.group(1).split("."))
            od = _make_date(dd, mm, academic_year_start)
            if od and prev_block_lessons:
                for les in prev_block_lessons:
                    les.time_overrides.append(TimeOverride(on_date=od, start_time=om.group(2), end_time=om.group(3)))
            else:
                warn(WarningSeverity.WARNING, f"исключение по времени без занятия: '{block.strip()}'", text)
            continue

        room_val, mis_r = _pick(room_parts, idx, len(blocks))
        build_val, mis_b = _pick(building_parts, idx, len(blocks))
        if (mis_r or mis_b) and not mismatch_reported:
            warn(
                WarningSeverity.WARNING,
                "количество значений аудитории/корпуса не совпадает с количеством занятий в ячейке",
                text,
            )
            mismatch_reported = True
        room, building, online_col = normalize_room_building(room_val, build_val)

        entries = _parse_block(block, academic_year_start)
        if not entries:
            warn(WarningSeverity.WARNING, "не удалось разобрать блок ячейки", block)
            continue

        prev_block_lessons = []
        for e in entries:
            online = online_col or e.online
            lesson = Lesson(
                group=raw.group_name,
                day_of_week=day,
                start_time=e.start_time or raw.start_time,
                end_time=e.end_time or raw.end_time,
                subject=e.subject,
                lesson_type=e.lesson_type,
                teacher=e.teacher,
                room=None if online else room,
                building=None if online else building,
                online=online,
                dates=e.dates,
                stream_group=e.stream_group,
                subgroup=e.subgroup,
                time_overrides=e.time_overrides,
                raw_text=text,
                source_cell=raw.coordinate,
            )
            lessons.append(lesson)
            prev_block_lessons.append(lesson)
            for w in e.warnings:
                warn(WarningSeverity.WARNING, w, text)
            for w in e.infos:
                warn(WarningSeverity.INFO, w, text)

    return lessons, notes, warnings
