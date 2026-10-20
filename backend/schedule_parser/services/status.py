"""
Статус ссылок программ: когда модуль заканчивается и нужна новая ссылка.

Используется скриптом scripts/check_expired.py и (дальше) эндпоинтом
GET /programs/{id}/status, по needs_new_link /
expiring_soon он показывает пользователю «начался новый модуль — вставьте
новую ссылку на расписание».
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models as m

# Нижегородский кампус: UTC+3, переходов на летнее время в России нет
LOCAL_TZ = dt.timezone(dt.timedelta(hours=3))


def today_local() -> dt.date:
    return dt.datetime.now(LOCAL_TZ).date()


@dataclass
class ProgramLinkStatus:
    program_id: int
    faculty: str
    program: str
    state: str                       # ok | expiring | needs_new_link
    needs_new_link: bool             # активной ссылки нет или её модуль закончился
    expiring_soon: bool              # модуль закончится в ближайшие warn_days
    days_left: Optional[int]         # до конца модуля (отрицательное — уже закончился)
    period_end: Optional[dt.date]
    module: Optional[int]
    source_id: Optional[int]


def status_from_sources(
    sources: Iterable[m.ScheduleSource], today: dt.date, warn_days: int
) -> dict:
    """Чистая логика статуса по списку источников одной программы."""
    sources = list(sources)
    active = [s for s in sources if s.status == "active"]

    def key(s: m.ScheduleSource):
        return (s.period_end or dt.date.min, s.id)

    if active:
        src = max(active, key=key)
        days_left = (src.period_end - today).days if src.period_end else None
        if days_left is not None and days_left < 0:
            state = "needs_new_link"
        elif days_left is not None and days_left <= warn_days:
            state = "expiring"
        else:
            state = "ok"
        source_id = src.id
    elif sources:
        src = max(sources, key=key)
        days_left = (src.period_end - today).days if src.period_end else None
        state = "needs_new_link"
        source_id = None
    else:
        return dict(
            state="needs_new_link", needs_new_link=True, expiring_soon=False, days_left=None,
            period_end=None, module=None, source_id=None,
        )

    return dict(
        state=state,
        needs_new_link=state == "needs_new_link",
        expiring_soon=state == "expiring",
        days_left=days_left,
        period_end=src.period_end,
        module=src.module,
        source_id=source_id,
    )


def all_program_statuses(session: Session, today: dt.date, warn_days: int) -> list[ProgramLinkStatus]:
    programs = session.execute(
        select(m.Program.id, m.Faculty.name, m.Program.degree, m.Program.name)
        .join(m.Faculty, m.Faculty.id == m.Program.faculty_id)
        .order_by(m.Faculty.name, m.Program.degree, m.Program.name)
    ).all()
    by_program: dict[int, list[m.ScheduleSource]] = {}
    for src in session.scalars(select(m.ScheduleSource)):
        by_program.setdefault(src.program_id, []).append(src)

    return [
        ProgramLinkStatus(
            program_id=pid, faculty=fac, program=f"{degree} {name}",
            **status_from_sources(by_program.get(pid, []), today, warn_days),
        )
        for pid, fac, degree, name in programs
    ]


def program_status(
    session: Session, program_id: int, today: dt.date, warn_days: int
) -> Optional[ProgramLinkStatus]:
    row = session.execute(
        select(m.Program.id, m.Faculty.name, m.Program.degree, m.Program.name)
        .join(m.Faculty, m.Faculty.id == m.Program.faculty_id)
        .where(m.Program.id == program_id)
    ).first()
    if row is None:
        return None
    sources = session.scalars(select(m.ScheduleSource).where(m.ScheduleSource.program_id == program_id)).all()
    pid, fac, degree, name = row
    return ProgramLinkStatus(
        program_id=pid, faculty=fac, program=f"{degree} {name}",
        **status_from_sources(sources, today, warn_days),
    )


def expire_sources(session: Session, today: dt.date) -> list[m.ScheduleSource]:
    """Активные источники, у которых модуль закончился, -> status = expired."""
    rows = session.scalars(
        select(m.ScheduleSource).where(
            m.ScheduleSource.status == "active",
            m.ScheduleSource.period_end.is_not(None),
            m.ScheduleSource.period_end < today,
        )
    ).all()
    for src in rows:
        src.status = "expired"
    return list(rows)
