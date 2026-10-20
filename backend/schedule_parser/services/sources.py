"""
Подключение новой ссылки на расписание (источника).

Ссылка сохраняется как источник ТОЛЬКО если расписание успешно скачалось, разобралось
и записалось. Всё выполняется в одной транзакции (savepoint): при любой ошибке в БД
ничего не остаётся. У программы может быть один активный источник: новая ссылка
переводит прежние активные источники этой программы в статус replaced (их данные
остаются — прошлые модули можно смотреть).
"""

from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..core.gsheets_api import GoogleSheetsAPIError, fetch_payload
from ..core.source import GOOGLE_SHEETS_RE
from app import models as m

from .importer import PreparedImport, prepare_import, write_import

_PROGRAM_RE = re.compile(r'^\s*(БАК|МАГ|СПЕЦ|АСП)\b\s*"?(.*?)"?\s*$', re.IGNORECASE)


@dataclass
class AddSourceResult:
    ok: bool
    message: str
    source_id: Optional[int] = None
    program_id: Optional[int] = None
    faculty: Optional[str] = None
    program: Optional[str] = None
    module: Optional[int] = None
    period_start: Optional[dt.date] = None
    period_end: Optional[dt.date] = None
    groups: int = 0
    lessons: int = 0
    already_exists: bool = False
    errors: list[str] = field(default_factory=list)


def split_program_label(label: Optional[str]) -> tuple[str, str]:
    """'БАК "Юриспруденция"' -> ('БАК', 'Юриспруденция')."""
    if not label:
        return "?", ""
    mt = _PROGRAM_RE.match(label)
    if not mt:
        return "?", label.strip()
    return mt.group(1).upper(), mt.group(2).strip() or mt.group(1).upper()


def _get_or_create_faculty(session: Session, name: str) -> m.Faculty:
    name = re.sub(r"\s+", " ", name).strip()
    fac = session.scalars(select(m.Faculty).where(func.lower(m.Faculty.name) == name.lower())).first()
    if fac is None:
        fac = m.Faculty(name=name)
        session.add(fac)
        session.flush()
    return fac


def _get_or_create_program(session: Session, faculty_id: int, degree: str, name: str) -> m.Program:
    prog = session.scalars(
        select(m.Program).where(
            m.Program.faculty_id == faculty_id,
            m.Program.degree == degree,
            func.lower(m.Program.name) == name.lower(),
        )
    ).first()
    if prog is None:
        prog = m.Program(faculty_id=faculty_id, degree=degree, name=name)
        session.add(prog)
        session.flush()
    return prog


def add_source(
    session: Session,
    url: str,
    api_key: str,
    *,
    faculty: Optional[str] = None,
    program: Optional[str] = None,
    today: Optional[dt.date] = None,
) -> AddSourceResult:
    """faculty / program — необязательное ручное уточнение (иначе берутся из названия таблицы)."""
    today = today or dt.date.today()

    mt = GOOGLE_SHEETS_RE.search(url or "")
    if not mt:
        return AddSourceResult(False, "Ссылка не похожа на Google Таблицу (docs.google.com/spreadsheets/d/…).")
    spreadsheet_id = mt.group(1)

    existing = session.scalars(
        select(m.ScheduleSource).where(m.ScheduleSource.spreadsheet_id == spreadsheet_id)
    ).first()
    if existing is not None and existing.status == "active":
        return AddSourceResult(
            True, "Эта ссылка уже подключена.", source_id=existing.id, program_id=existing.program_id,
            module=existing.module, period_start=existing.period_start, period_end=existing.period_end,
            already_exists=True,
        )

    try:
        payload = fetch_payload(spreadsheet_id, api_key)
    except GoogleSheetsAPIError as exc:
        return AddSourceResult(False, f"Не удалось получить таблицу: {exc}")

    try:
        prepared: PreparedImport = prepare_import(payload, faculty, program, today)
    except Exception as exc:  # noqa: BLE001
        return AddSourceResult(False, f"Не удалось разобрать расписание: {exc!r}")

    if prepared.critical:
        return AddSourceResult(False, "Расписание не удалось разобрать.", errors=prepared.critical[:10])
    if prepared.period_end and prepared.period_end < today:
        return AddSourceResult(
            False,
            f"Модуль уже закончился ({prepared.period_end:%d.%m.%Y}) — нужна ссылка на актуальный модуль.",
            module=prepared.module, period_start=prepared.period_start, period_end=prepared.period_end,
        )
    if not prepared.faculty or not prepared.program:
        return AddSourceResult(
            False,
            "Не удалось определить факультет и программу из названия таблицы — укажите их явно.",
        )

    degree, prog_name = split_program_label(prepared.program)

    try:
        with session.begin_nested():
            fac = _get_or_create_faculty(session, prepared.faculty)
            prog = _get_or_create_program(session, fac.id, degree, prog_name)

            # у программы один активный источник
            session.execute(
                update(m.ScheduleSource)
                .where(
                    m.ScheduleSource.program_id == prog.id,
                    m.ScheduleSource.status == "active",
                    m.ScheduleSource.spreadsheet_id != spreadsheet_id,
                )
                .values(status="replaced")
            )

            if existing is not None:
                source = existing
                source.url = url
                source.program_id = prog.id
                source.status = "active"
            else:
                source = m.ScheduleSource(
                    program_id=prog.id, url=url, spreadsheet_id=spreadsheet_id, status="active"
                )
                session.add(source)
            session.flush()

            imp, _occ = write_import(session, source, prepared)
    except Exception as exc:  # noqa: BLE001
        return AddSourceResult(False, f"Ошибка при сохранении расписания: {exc!r}")

    return AddSourceResult(
        True,
        "Ссылка подключена, расписание загружено.",
        source_id=source.id,
        program_id=source.program_id,
        faculty=fac.name,
        program=f"{degree} {prog_name}",
        module=prepared.module,
        period_start=prepared.period_start,
        period_end=prepared.period_end,
        groups=prepared.groups_count,
        lessons=prepared.lessons_count,
    )
