"""
Normalizer — превращает "сырую" ячейку (RawCell) в один или несколько
Lesson / ScheduleNote плюс список предупреждений.

Реальные ячейки расписания оказались заметно грязнее иллюстративного
примера из ТЗ. Наблюдаемые в файле конвенции (см. ANALYSIS.md):

1. Одна пара, без дат — простая форма:
   "Предмет - тип\nПреподаватель"

2. Пара с датами — "плоская" форма (всё в одну строку, через ' - '):
   "07.09.-19.10. Предмет - тип - stream_group - Преподаватель"
   (stream_group не всегда присутствует — тогда 3 части вместо 4)

3. Несколько пар в одной ячейке (разные даты/предметы в одном слоте),
   разделены пустой строкой (двойной перевод строки).

4. Точечное исключение по времени внутри даты:
   "06.10. в 09:30-10:10" — отдельной строкой (пара смещена по времени
   именно в этот день) или как начало записи вместе с полным описанием
   занятия.

5. Онлайн обозначается текстом " -" в столбце аудитории и "online" в
   столбце корпуса, а не отдельным флагом.

6. Блоки-заглушки ("Занятия проводятся по расписанию дисциплины...",
   "...согласно расписанию секций") — это НЕ занятие, а отсылка к
   другому расписанию. Превращать их в Lesson с выдуманными полями
   нельзя (ТЗ, раздел 19) — вместо этого выдаётся ScheduleNote.

Ни один единичный "непонятный" случай не должен приводить к исключению:
parser обязан вернуть максимум того, что смог понять, и явно
предупредить про остальное (ТЗ, раздел 19-20).
"""

from __future__ import annotations

import re
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

DATE_TOKEN_RE = re.compile(r"(\d{1,2})\.(\d{1,2})")
DATE_PREFIX_RE = re.compile(r"^((?:\d{1,2}\.\d{1,2}\.?[\s,.\-–]*)+)")
# "с 10.09. Предмет ..." — занятие действует с указанной даты до конца
# периода расписания (конец не указан явно).
OPEN_START_RE = re.compile(r"^с\s+(\d{1,2})\.(\d{1,2})\.?\s+")
RANGE_RE = re.compile(r"^\s*\d{1,2}\.\d{1,2}\.?\s*[-–]\s*\d{1,2}\.\d{1,2}\.?\.?\s*$")
OVERRIDE_ONLY_RE = re.compile(
    r"^(\d{1,2}\.\d{1,2})\.?\s+в\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$",
    re.IGNORECASE,
)
OVERRIDE_LEADING_RE = re.compile(
    r"^(\d{1,2}\.\d{1,2})\.?\s+в\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.+)$",
    re.IGNORECASE | re.DOTALL,
)
CANCEL_ONLY_RE = re.compile(
    r"^(\d{1,2}\.\d{1,2})\.?\s*-\s*отмена\s+занятия\s*$", re.IGNORECASE
)
DASH_SPLIT_RE = re.compile(r"\s-\s")
STREAM_GROUP_CODE_RE = re.compile(r"[_].*\d|\d.*_")
# "Мизонова В.Г." / "Марьевичев Н." (одна инициал) / "Лобанов Павел" (имя целиком)
TEACHER_NAME_RE = re.compile(
    r"^[А-ЯЁ][а-яё\-]+\s+(?:[А-ЯЁ][а-яё]+|[А-ЯЁ]\.\s?[А-ЯЁ]?\.?)$"
)
NOTE_KEYWORDS_RE = re.compile(
    r"проводятся по расписанию дисциплин|согласно расписанию секций|"
    r"занятия по дисциплин|военная кафедра",
    re.IGNORECASE,
)

BUILDING_ONLINE_MARKER = "online"


def resolve_year(month: int, academic_year_start: int) -> int:
    """Учебный год начинается в сентябре: месяцы сен-дек относятся к
    стартовому году, янв-авг — к следующему календарному году."""
    return academic_year_start if month >= 9 else academic_year_start + 1


def _make_date(day: int, month: int, academic_year_start: int) -> Optional[date]:
    try:
        return date(resolve_year(month, academic_year_start), month, day)
    except ValueError:
        return None


def parse_date_rule(text: str, academic_year_start: int) -> tuple[DateRule, str]:
    """Отделяет ведущий префикс с датами от остального текста.

    Возвращает (DateRule, remainder). Если дат нет — DateRule типа
    WHOLE_PERIOD и remainder == исходный текст.
    """
    m_open = OPEN_START_RE.match(text)
    if m_open:
        start = _make_date(int(m_open.group(1)), int(m_open.group(2)), academic_year_start)
        remainder = text[m_open.end():].lstrip()
        if remainder:
            return (
                DateRule(type=DateRuleType.RANGE, start_date=start, end_date=None, raw=m_open.group(0).strip()),
                remainder,
            )

    m = DATE_PREFIX_RE.match(text)
    if not m:
        return DateRule(type=DateRuleType.WHOLE_PERIOD), text

    prefix = m.group(1)
    tokens = DATE_TOKEN_RE.findall(prefix)
    if not tokens:
        return DateRule(type=DateRuleType.WHOLE_PERIOD), text

    remainder = text[m.end():].lstrip()
    if not remainder:
        # Похоже на дату, но после неё ничего нет — не считаем префиксом.
        return DateRule(type=DateRuleType.WHOLE_PERIOD), text

    if len(tokens) == 2 and RANGE_RE.match(prefix.strip()):
        (d1, m1), (d2, m2) = tokens
        start = _make_date(int(d1), int(m1), academic_year_start)
        end = _make_date(int(d2), int(m2), academic_year_start)
        return (
            DateRule(type=DateRuleType.RANGE, start_date=start, end_date=end, raw=prefix.strip()),
            remainder,
        )

    dates = []
    for d, mo in tokens:
        dt = _make_date(int(d), int(mo), academic_year_start)
        if dt is not None:
            dates.append(dt)
    rule_type = DateRuleType.SINGLE if len(dates) == 1 else DateRuleType.LIST
    return DateRule(type=rule_type, dates=dates, raw=prefix.strip()), remainder


def parse_lesson_text(remainder: str) -> dict:
    """Разбирает subject/type/stream_group/teacher из текста ПОСЛЕ того,
    как из него убран префикс с датами."""
    lines = [l.strip() for l in remainder.split("\n") if l.strip()]
    teacher = None
    warnings: list[str] = []

    if not lines:
        return dict(subject=None, lesson_type=None, teacher=None, stream_group=None, warnings=["пустой текст занятия"])

    if len(lines) >= 2 and " - " not in lines[-1]:
        teacher = lines[-1]
        head = " ".join(lines[:-1])
    else:
        head = " ".join(lines)

    head = head.strip().rstrip(" -").strip()
    parts = [p.strip() for p in DASH_SPLIT_RE.split(head) if p.strip()]

    subject = lesson_type = stream_group = None

    # Независимо от того, сколько частей получилось после разбора по ' - ',
    # если последняя часть похожа на "Фамилия И.О." — это преподаватель,
    # а не тип занятия (в реальном файле встречается запись
    # "Предмет - Фамилия И.О." вообще без указания типа занятия).
    if teacher is None and parts and TEACHER_NAME_RE.match(parts[-1]):
        teacher = parts.pop()

    if len(parts) == 0:
        if subject is None:
            warnings.append("не удалось выделить название дисциплины")
    elif len(parts) == 1:
        subject = parts[0]
        if teacher is None:
            warnings.append("не удалось определить тип занятия и преподавателя")
        else:
            warnings.append("не удалось определить тип занятия")
    elif len(parts) == 2:
        subject, lesson_type = parts
        if teacher is None:
            warnings.append("не удалось определить преподавателя")
    elif len(parts) == 3:
        # Третья часть может быть либо кодом stream_group (содержит цифры
        # и подчёркивания, напр. "26_27_М_ОРГ_Г_1115950_10"), либо
        # преподавателем в нетиповом формате (несколько ФИО через запятую,
        # "Вакансия" и т. п.). Код stream_group отличим по формату.
        subject, lesson_type, tail = parts
        if STREAM_GROUP_CODE_RE.search(tail):
            stream_group = tail
            if teacher is None:
                warnings.append("не удалось определить преподавателя")
        else:
            teacher = tail
    else:
        subject, lesson_type, stream_group = parts[0], parts[1], parts[2]
        warnings.append(f"неожиданно много частей ({len(parts)}) после разбора по ' - '; лишнее отброшено (см. raw_text)")

    return dict(
        subject=subject,
        lesson_type=lesson_type,
        teacher=teacher,
        stream_group=stream_group,
        warnings=warnings,
    )


def normalize_room_building(room_text: Optional[str], building_text: Optional[str]) -> tuple[Optional[str], Optional[str], bool]:
    """"ауд. -, online" -> room=None, building=None, online=True."""
    building_clean = building_text.strip() if isinstance(building_text, str) else building_text
    room_clean = room_text.strip() if isinstance(room_text, str) else room_text

    if isinstance(building_clean, str) and building_clean.lower() == BUILDING_ONLINE_MARKER:
        return None, None, True

    if isinstance(room_clean, str) and room_clean in ("", "-", "—"):
        room_clean = None

    return room_clean, building_clean or None, False


SEPARATOR_LINE_RE = re.compile(r"\n\s*-{3,}\s*\n")


def _split_cell_into_blocks(text: str) -> list[str]:
    # Несколько занятий в одной ячейке разделяются либо пустой строкой,
    # либо (реже) строкой из одних дефисов — оба варианта встречаются
    # в реальном файле.
    text = SEPARATOR_LINE_RE.sub("\n\n", text)
    return [b for b in re.split(r"\n\s*\n", text) if b.strip()]


def _extract_trailing_override(block: str) -> tuple[str, Optional[tuple[str, str, str]], Optional[str]]:
    """Отделяет от блока последнюю строку, если это:
    - 'чистое' исключение по времени ('06.10. в 09:30-10:10') -> вернёт
      (date, start, end) вторым элементом;
    - отмена занятия в конкретную дату ('07.09. - отмена занятия') ->
      вернёт дату строкой третьим элементом.
    """
    lines = block.split("\n")
    last = lines[-1].strip()

    m = OVERRIDE_ONLY_RE.match(last)
    if m and len(lines) > 1:
        return "\n".join(lines[:-1]), (m.group(1), m.group(2), m.group(3)), None

    m = CANCEL_ONLY_RE.match(last)
    if m and len(lines) > 1:
        return "\n".join(lines[:-1]), None, m.group(1)

    return block, None, None


def normalize_cell(
    raw: RawCell,
    academic_year_start: int,
    day_map: dict[str, DayOfWeek] = RAW_DAY_MAP,
) -> tuple[list[Lesson], list[ScheduleNote], list[ParseWarning]]:
    lessons: list[Lesson] = []
    notes: list[ScheduleNote] = []
    warnings: list[ParseWarning] = []

    day_key = raw.day_raw.strip().lower()
    day = day_map.get(day_key)
    if day is None:
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.ERROR,
                message=f"Неизвестное обозначение дня недели: '{raw.day_raw}'",
                location=raw.coordinate,
                raw_value=raw.day_raw,
            )
        )
        return lessons, notes, warnings

    if raw.subject_text is None:
        return lessons, notes, warnings
    text = raw.subject_text if isinstance(raw.subject_text, str) else str(raw.subject_text)
    text = text.strip()
    if not text:
        return lessons, notes, warnings

    if NOTE_KEYWORDS_RE.search(text):
        notes.append(
            ScheduleNote(
                group=raw.group_name,
                day_of_week=day,
                start_time=raw.start_time,
                end_time=raw.end_time,
                text=text,
                source_cell=raw.coordinate,
            )
        )
        return lessons, notes, warnings

    room, building, online = normalize_room_building(raw.room_text, raw.building_text)

    for block in _split_cell_into_blocks(text):
        block, trailing_override, trailing_cancel = _extract_trailing_override(block)

        time_override: Optional[TimeOverride] = None
        leading_m = OVERRIDE_LEADING_RE.match(block.strip())
        entry_start, entry_end = raw.start_time, raw.end_time

        if leading_m:
            od, ostart, oend = leading_m.group(1), leading_m.group(2), leading_m.group(3)
            rest_text = leading_m.group(4)
            dd, mm = (int(x) for x in od.split("."))
            override_date = _make_date(dd, mm, academic_year_start)
            dates_rule = DateRule(
                type=DateRuleType.SINGLE,
                dates=[override_date] if override_date else [],
                raw=od,
            )
            entry_start, entry_end = ostart, oend
            remainder = rest_text
        else:
            dates_rule, remainder = parse_date_rule(block, academic_year_start)

        parsed = parse_lesson_text(remainder)

        if trailing_cancel:
            dd, mm = (int(x) for x in trailing_cancel.split("."))
            cancel_date = _make_date(dd, mm, academic_year_start)
            if cancel_date:
                dates_rule.excluded_dates.append(cancel_date)
            else:
                warnings.append(
                    ParseWarning(
                        severity=WarningSeverity.WARNING,
                        message=f"Не удалось разобрать дату отмены занятия: '{trailing_cancel}'",
                        location=raw.coordinate,
                        raw_value=block,
                    )
                )

        if trailing_override:
            od, ostart, oend = trailing_override
            dd, mm = (int(x) for x in od.split("."))
            override_date = _make_date(dd, mm, academic_year_start)
            if override_date:
                time_override = TimeOverride(on_date=override_date, start_time=ostart, end_time=oend)
            else:
                warnings.append(
                    ParseWarning(
                        severity=WarningSeverity.WARNING,
                        message=f"Не удалось разобрать дату в исключении по времени: '{od}'",
                        location=raw.coordinate,
                        raw_value=block,
                    )
                )

        for w in parsed["warnings"]:
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.WARNING,
                    message=w,
                    location=raw.coordinate,
                    raw_value=text,
                )
            )

        lesson = Lesson(
            group=raw.group_name,
            day_of_week=day,
            start_time=entry_start,
            end_time=entry_end,
            subject=parsed["subject"],
            lesson_type=parsed["lesson_type"],
            teacher=parsed["teacher"],
            room=room,
            building=building,
            online=online,
            dates=dates_rule,
            stream_group=parsed["stream_group"],
            time_overrides=[time_override] if time_override else [],
            raw_text=text,
            source_cell=raw.coordinate,
        )
        lessons.append(lesson)

    return lessons, notes, warnings
