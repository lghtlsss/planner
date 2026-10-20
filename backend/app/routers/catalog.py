from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.s_catalog import FacultyOut, GroupOut, ProgramLinkOut, ProgramOut, ProgramStatusOut
from app import models as m
from app.database import get_db
from app.config import settings
from schedule_parser.services.status import program_status, status_from_sources, today_local

router = APIRouter(tags=["catalog"])

_ACTIVE_PROGRAM_IDS = select(m.ScheduleSource.program_id).where(m.ScheduleSource.status == "active")


@router.get("/faculties", response_model=list[FacultyOut])
def list_faculties(
    include_inactive: bool = Query(False, description="включая факультеты без активной ссылки на расписание"),
    session: Session = Depends(get_db),
):
    q = select(m.Faculty).order_by(m.Faculty.name)
    if not include_inactive:
        q = q.where(
            m.Faculty.id.in_(select(m.Program.faculty_id).where(m.Program.id.in_(_ACTIVE_PROGRAM_IDS)))
        )
    return [FacultyOut(id=f.id, name=f.name) for f in session.scalars(q)]


@router.get("/programs", response_model=list[ProgramOut])
def list_programs(
    faculty_id: Optional[int] = None,
    include_inactive: bool = False,
    session: Session = Depends(get_db),
):
    q = (
        select(m.Program, m.Faculty)
        .join(m.Faculty, m.Faculty.id == m.Program.faculty_id)
        .order_by(m.Faculty.name, m.Program.degree, m.Program.name)
    )
    if faculty_id is not None:
        q = q.where(m.Program.faculty_id == faculty_id)
    if not include_inactive:
        q = q.where(m.Program.id.in_(_ACTIVE_PROGRAM_IDS))
    rows = session.execute(q).all()

    sources: dict[int, list] = {}
    for src in session.scalars(select(m.ScheduleSource)):
        sources.setdefault(src.program_id, []).append(src)

    today, warn_days = today_local(), settings.expiry_warning_days
    return [
        ProgramOut(
            id=prog.id, faculty_id=fac.id, faculty=fac.name, degree=prog.degree, name=prog.name,
            label=f"{prog.degree} {prog.name}",
            link=ProgramLinkOut(**status_from_sources(sources.get(prog.id, []), today, warn_days)),
        )
        for prog, fac in rows
    ]


@router.get("/programs/{program_id}/status", response_model=ProgramStatusOut)
def get_program_status(program_id: int, session: Session = Depends(get_db)):
    """Нужна ли новая ссылка (needs_new_link) или модуль скоро закончится (expiring_soon)."""
    st = program_status(session, program_id, today_local(), settings.expiry_warning_days)
    if st is None:
        raise HTTPException(status_code=404, detail="Программа не найдена")
    return ProgramStatusOut(**st.__dict__)


@router.get("/groups", response_model=list[GroupOut])
def list_groups(
    program_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    course: Optional[int] = None,
    q: Optional[str] = Query(None, description="поиск по названию группы"),
    include_inactive: bool = False,
    limit: int = Query(500, ge=1, le=2000),
    session: Session = Depends(get_db),
):
    query = (
        select(m.Group, m.Program, m.Faculty)
        .join(m.Program, m.Program.id == m.Group.program_id)
        .join(m.Faculty, m.Faculty.id == m.Program.faculty_id)
        .order_by(m.Faculty.name, m.Program.name, m.Group.course, m.Group.name)
        .limit(limit)
    )
    if program_id is not None:
        query = query.where(m.Group.program_id == program_id)
    if faculty_id is not None:
        query = query.where(m.Program.faculty_id == faculty_id)
    if course is not None:
        query = query.where(m.Group.course == course)
    if q:
        query = query.where(m.Group.name.ilike(f"%{q}%"))
    if not include_inactive:
        query = query.where(m.Group.program_id.in_(_ACTIVE_PROGRAM_IDS))

    return [
        GroupOut(
            id=g.id, name=g.name, course=g.course, stream_label=g.stream_label,
            program_id=p.id, program=f"{p.degree} {p.name}", faculty_id=f.id, faculty=f.name,
        )
        for g, p, f in session.execute(query)
    ]
