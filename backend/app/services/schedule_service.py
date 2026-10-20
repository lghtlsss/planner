"""
Запрос расписания группы за период (по lesson_occurrences).

Берутся только занятия актуальных импортов (is_current). Фильтры:
- subgroup: занятия без подгруппы показываются всегда, с подгруппой — только своей;
- stream_groups: занятия без кода потока показываются всегда, с кодом — только если он
  в списке пользователя (если список не передан — показываются все).
В meta возвращаются все варианты подгрупп/кодов потока, найденные в периоде (до фильтрации),
чтобы приложение могло предложить пользователю выбрать свои.
"""

from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass, field
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m

MAX_RANGE_DAYS = 62
WEEKDAY_SHORT = {1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс"}


class RangeError(ValueError):
    """Некорректный диапазон дат."""


def resolve_range(
    date_from: Optional[dt.date], date_to: Optional[dt.date], today: dt.date
) -> tuple[dt.date, dt.date]:
    """Ничего не передано -> текущая неделя (пн–вс); одна граница -> 7 дней от/до неё."""
    if date_from is None and date_to is None:
        monday = today - dt.timedelta(days=today.isoweekday() - 1)
        return monday, monday + dt.timedelta(days=6)
    if date_from is None:
        date_from = date_to - dt.timedelta(days=6)
    if date_to is None:
        date_to = date_from + dt.timedelta(days=6)
    if date_to < date_from:
        raise RangeError("date_to раньше date_from")
    if (date_to - date_from).days + 1 > MAX_RANGE_DAYS:
        raise RangeError(f"Слишком большой период (максимум {MAX_RANGE_DAYS} дн.)")
    return date_from, date_to


def normalize_subgroup(value: Optional[str]) -> Optional[str]:
    """'1' / 'гр.1' / 'группа 1' -> 'группа 1' (так подгруппа хранится в БД)."""
    if not value:
        return None
    digits = re.search(r"\d+", value)
    return f"группа {digits.group(0)}" if digits else value.strip().lower()


def _hhmm(t: dt.time) -> str:
    return t.strftime("%H:%M")


@dataclass
class LessonItem:
    start_time: str
    end_time: str
    subject: Optional[str]
    lesson_type: Optional[str]
    teacher: Optional[str]
    room: Optional[str]
    building: Optional[str]
    building_address: Optional[str]
    online: bool
    stream_group: Optional[str]
    subgroup: Optional[str]
    is_approximate: bool


@dataclass
class NoteItem:
    start_time: str
    end_time: str
    text: str


@dataclass
class DayItem:
    date: dt.date
    weekday: int
    weekday_short: str
    lessons: list[LessonItem] = field(default_factory=list)
    notes: list[NoteItem] = field(default_factory=list)


@dataclass
class GroupInfo:
    id: int
    name: str
    course: int
    stream_label: Optional[str]
    program_id: int
    program: str
    faculty_id: int
    faculty: str


@dataclass
class ScheduleMeta:
    stream_groups_available: list[str]
    subgroups_available: list[str]
    has_approximate: bool


@dataclass
class ScheduleResult:
    group: GroupInfo
    date_from: dt.date
    date_to: dt.date
    days: list[DayItem]
    meta: ScheduleMeta


def get_schedule(
    session: Session,
    group_id: int,
    date_from: dt.date,
    date_to: dt.date,
    subgroup: Optional[str] = None,
    stream_groups: Optional[Sequence[str]] = None,
) -> Optional[ScheduleResult]:
    row = session.execute(
        select(m.Group, m.Program, m.Faculty)
        .join(m.Program, m.Program.id == m.Group.program_id)
        .join(m.Faculty, m.Faculty.id == m.Program.faculty_id)
        .where(m.Group.id == group_id)
    ).first()
    if row is None:
        return None
    grp, prog, fac = row
    group_info = GroupInfo(
        id=grp.id, name=grp.name, course=grp.course, stream_label=grp.stream_label,
        program_id=prog.id, program=f"{prog.degree} {prog.name}", faculty_id=fac.id, faculty=fac.name,
    )

    occ_rows = session.execute(
        select(m.LessonOccurrence, m.Lesson)
        .join(m.Lesson, m.Lesson.id == m.LessonOccurrence.lesson_id)
        .join(m.ScheduleImport, m.ScheduleImport.id == m.Lesson.import_id)
        .where(
            m.LessonOccurrence.group_id == group_id,
            m.ScheduleImport.is_current.is_(True),
            m.LessonOccurrence.date.between(date_from, date_to),
        )
        .order_by(m.LessonOccurrence.date, m.LessonOccurrence.start_time, m.Lesson.id)
    ).all()

    addresses = {b.code: b.address for b in session.scalars(select(m.Building))}

    wanted_sub = normalize_subgroup(subgroup)
    wanted_streams = set(stream_groups) if stream_groups else None

    available_streams = sorted({les.stream_group for _, les in occ_rows if les.stream_group})
    available_subgroups = sorted({les.subgroup for _, les in occ_rows if les.subgroup})

    lessons_by_date: dict[dt.date, list[LessonItem]] = {}
    has_approx = False
    for occ, les in occ_rows:
        if wanted_sub and les.subgroup and les.subgroup != wanted_sub:
            continue
        if wanted_streams is not None and les.stream_group and les.stream_group not in wanted_streams:
            continue
        has_approx = has_approx or occ.is_approximate
        lessons_by_date.setdefault(occ.date, []).append(
            LessonItem(
                start_time=_hhmm(occ.start_time), end_time=_hhmm(occ.end_time),
                subject=les.subject, lesson_type=les.lesson_type, teacher=les.teacher,
                room=les.room, building=les.building,
                building_address=addresses.get(les.building) if les.building else None,
                online=les.online, stream_group=les.stream_group, subgroup=les.subgroup,
                is_approximate=occ.is_approximate,
            )
        )

    note_rows = session.execute(
        select(m.ScheduleNote, m.ScheduleImport.period_start, m.ScheduleImport.period_end)
        .join(m.ScheduleImport, m.ScheduleImport.id == m.ScheduleNote.import_id)
        .where(m.ScheduleNote.group_id == group_id, m.ScheduleImport.is_current.is_(True))
    ).all()

    days: list[DayItem] = []
    d = date_from
    while d <= date_to:
        iso = d.isoweekday()
        day = DayItem(date=d, weekday=iso, weekday_short=WEEKDAY_SHORT[iso],
                      lessons=lessons_by_date.get(d, []))
        seen: set[tuple] = set()
        for note, p_start, p_end in note_rows:
            if note.day_of_week != iso:
                continue
            if (p_start and d < p_start) or (p_end and d > p_end):
                continue
            key = (note.start_time, note.end_time, note.text)
            if key in seen:
                continue
            seen.add(key)
            day.notes.append((note.start_time, NoteItem(_hhmm(note.start_time), _hhmm(note.end_time), note.text)))
        day.notes = [n for _, n in sorted(day.notes, key=lambda x: x[0])]
        days.append(day)
        d += dt.timedelta(days=1)

    return ScheduleResult(
        group=group_info, date_from=date_from, date_to=date_to, days=days,
        meta=ScheduleMeta(available_streams, available_subgroups, has_approx),
    )
