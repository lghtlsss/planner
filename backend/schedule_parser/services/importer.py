"""
Импорт расписания источника в БД.

refresh_source() — то, что вызывает cron раз в ~8 часов для каждого активного источника:
  - хеш не изменился        -> только last_checked_at;
  - то же отклонённое уже   -> пропуск (не плодим записи);
  - разбор/валидация/sanity не прошли -> импорт status=rejected, старое расписание остаётся;
  - всё хорошо              -> новый импорт становится актуальным, хранятся актуальный + предыдущий.

Вызывающий код делает session.commit() (по одному источнику на транзакцию).
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from ..core.gsheets_api import ApiPayload, GoogleSheetsAPIError, fetch_payload, parse_payload
from ..core.models import DayOfWeek, ParsedSchedule, WarningSeverity
from ..core.pipeline import build_schedule_from_raw
from app import models as m

from .occurrences import expand_lesson

SANITY_DROP_RATIO = 0.5          # падение числа групп/занятий больше чем на 50% — подозрительно
KEEP_BAD_IMPORTS = 5             # сколько rejected/failed записей истории хранить на источник
MAX_STORED_WARNINGS = 300
OCCURRENCE_CHUNK = 5000

_DAY_ISO = {
    DayOfWeek.MONDAY: 1, DayOfWeek.TUESDAY: 2, DayOfWeek.WEDNESDAY: 3, DayOfWeek.THURSDAY: 4,
    DayOfWeek.FRIDAY: 5, DayOfWeek.SATURDAY: 6, DayOfWeek.SUNDAY: 7,
}
_SEVERITY_RANK = {"critical": 0, "error": 1, "warning": 2, "info": 3}
# предупреждения парсера, после которых даты занятия недостоверны -> запасной режим
_DATE_PROBLEM_PREFIXES = (
    "некорректная дата",
    "несколько диапазонов дат",
    "не удалось разобрать дату",
)


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


@dataclass
class PreparedImport:
    schedules: list[ParsedSchedule]
    content_hash: str
    spreadsheet_title: Optional[str]
    faculty: Optional[str]
    program: Optional[str]                 # 'БАК "Юриспруденция"'
    academic_year: int
    module: Optional[int]
    period_start: Optional[dt.date]
    period_end: Optional[dt.date]
    groups_count: int
    lessons_count: int
    notes_count: int
    warnings: list[dict]                   # компактный список для JSONB
    warnings_count: int
    errors_count: int
    critical: list[str] = field(default_factory=list)   # причины отказа


@dataclass
class ImportOutcome:
    status: str          # imported | unchanged | rejected | failed | skipped
    source_id: int
    message: str = ""
    import_id: Optional[int] = None
    groups: int = 0
    lessons: int = 0
    occurrences: int = 0
    warnings: int = 0


# ---------------------------------------------------------------------------
# Разбор и валидация (без БД)
# ---------------------------------------------------------------------------


def guess_academic_year(today: dt.date) -> int:
    return today.year if today.month >= 9 else today.year - 1


def prepare_import(
    payload: ApiPayload,
    faculty: Optional[str] = None,
    program: Optional[str] = None,
    today: Optional[dt.date] = None,
) -> PreparedImport:
    today = today or dt.date.today()
    result = parse_payload(payload, faculty, program)

    academic_year = result.academic_year_start
    if academic_year is None:
        academic_year = guess_academic_year(today)

    schedules: list[ParsedSchedule] = []
    critical: list[str] = []
    all_warnings: list[dict] = []

    for raw in result.raw_sheets:
        schedule = build_schedule_from_raw(raw, academic_year)
        schedules.append(schedule)
        for w in schedule.warnings:
            if w.severity == WarningSeverity.CRITICAL:
                critical.append(f"[{raw.sheet_name}] {w.message}")
            all_warnings.append(
                {
                    "severity": w.severity.value,
                    "message": w.message,
                    "location": f"{raw.sheet_name}!{w.location}" if w.location else raw.sheet_name,
                    "raw_value": (w.raw_value or "")[:300] or None,
                }
            )

    if not schedules:
        critical.append("В таблице не найдено ни одного листа с расписанием.")

    starts = [s.metadata.period_start for s in schedules if s.metadata.period_start]
    ends = [s.metadata.period_end for s in schedules if s.metadata.period_end]
    period_start = min(starts) if starts else None
    period_end = max(ends) if ends else None
    if schedules and (period_start is None or period_end is None):
        critical.append("Не удалось определить период модуля из заголовков листов.")

    modules = {s.metadata.module for s in schedules if s.metadata.module}
    module = min(modules) if len(modules) == 1 else (None if not modules else min(modules))
    if len(modules) > 1:
        all_warnings.append(
            {"severity": "warning", "message": f"На листах указаны разные номера модулей: {sorted(modules)}",
             "location": None, "raw_value": None}
        )

    group_names = {name for s in schedules for name in s.groups}
    lessons_count = sum(len(s.lessons) for s in schedules)
    notes_count = sum(len(s.notes) for s in schedules)

    all_warnings.sort(key=lambda w: _SEVERITY_RANK.get(w["severity"], 9))
    warnings_count = sum(1 for w in all_warnings if w["severity"] == "warning")
    errors_count = sum(1 for w in all_warnings if w["severity"] in ("error", "critical"))

    return PreparedImport(
        schedules=schedules,
        content_hash=payload.content_hash,
        spreadsheet_title=payload.spreadsheet_title,
        faculty=result.faculty,
        program=result.program,
        academic_year=academic_year,
        module=module,
        period_start=period_start,
        period_end=period_end,
        groups_count=len(group_names),
        lessons_count=lessons_count,
        notes_count=notes_count,
        warnings=all_warnings[:MAX_STORED_WARNINGS],
        warnings_count=warnings_count,
        errors_count=errors_count,
        critical=critical,
    )


def sanity_problem(prev: Optional[m.ScheduleImport], prepared: PreparedImport) -> Optional[str]:
    """Защита от «парсер сломался и тихо съел половину расписания»."""
    if prev is None:
        return None
    if prev.groups_count and prepared.groups_count < prev.groups_count * (1 - SANITY_DROP_RATIO):
        return (
            f"Число групп резко упало: было {prev.groups_count}, стало {prepared.groups_count}. "
            "Новое расписание не применено."
        )
    if prev.lessons_count and prepared.lessons_count < prev.lessons_count * (1 - SANITY_DROP_RATIO):
        return (
            f"Число занятий резко упало: было {prev.lessons_count}, стало {prepared.lessons_count}. "
            "Новое расписание не применено."
        )
    return None


# ---------------------------------------------------------------------------
# Запись
# ---------------------------------------------------------------------------


def _cut(value: Optional[str], n: int) -> Optional[str]:
    if value is None:
        return None
    return value if len(value) <= n else value[:n]


def _to_time(value: str) -> dt.time:
    h, mi = str(value).split(":")[:2]
    return dt.time(int(h), int(mi))


def _upsert_groups(session: Session, program_id: int, schedules: list[ParsedSchedule]) -> dict[str, int]:
    wanted: dict[str, tuple[int, Optional[str]]] = {}
    for s in schedules:
        for name, g in s.groups.items():
            wanted[name] = (g.course, g.stream_label)

    existing = {
        g.name: g
        for g in session.scalars(select(m.Group).where(m.Group.program_id == program_id))
    }
    for name, (course, label) in wanted.items():
        grp = existing.get(name)
        if grp is None:
            grp = m.Group(
                program_id=program_id, name=_cut(name, 128), course=course or 0,
                stream_label=_cut(label, 512) or None,
            )
            session.add(grp)
            existing[name] = grp
        else:
            if course:
                grp.course = course
            if label:
                grp.stream_label = _cut(label, 512)
    session.flush()
    return {name: existing[name].id for name in wanted}


def _upsert_buildings(session: Session, schedules: list[ParsedSchedule]) -> None:
    wanted: dict[str, Optional[str]] = {}
    for s in schedules:
        for code, b in s.buildings.items():
            wanted[code] = b.address
    for code, address in wanted.items():
        session.merge(m.Building(code=_cut(code, 16), address=address))


def _date_problem_cells(schedule: ParsedSchedule) -> set[str]:
    return {
        w.location
        for w in schedule.warnings
        if w.location and w.message.startswith(_DATE_PROBLEM_PREFIXES)
    }


def _cleanup_old_imports(session: Session, source_id: int) -> None:
    """Оставляем актуальный + предыдущий успешный импорт и последние
    KEEP_BAD_IMPORTS отклонённых/упавших записей истории."""
    session.flush()
    ok_ids = session.scalars(
        select(m.ScheduleImport.id)
        .where(m.ScheduleImport.source_id == source_id, m.ScheduleImport.status == "success")
        .order_by(m.ScheduleImport.started_at.desc(), m.ScheduleImport.id.desc())
    ).all()
    bad_ids = session.scalars(
        select(m.ScheduleImport.id)
        .where(m.ScheduleImport.source_id == source_id, m.ScheduleImport.status != "success")
        .order_by(m.ScheduleImport.started_at.desc(), m.ScheduleImport.id.desc())
    ).all()
    drop = list(ok_ids[2:]) + list(bad_ids[KEEP_BAD_IMPORTS:])
    if drop:
        # lessons / occurrences / notes удаляются каскадом на уровне БД
        session.execute(delete(m.ScheduleImport).where(m.ScheduleImport.id.in_(drop)))


def _apply_success_to_source(source: m.ScheduleSource, prepared: PreparedImport, now: dt.datetime) -> None:
    source.title = prepared.spreadsheet_title
    source.module = prepared.module
    source.academic_year = prepared.academic_year
    source.period_start = prepared.period_start
    source.period_end = prepared.period_end
    source.last_hash = prepared.content_hash
    source.last_checked_at = now
    source.last_success_at = now
    source.last_error = None


def write_import(
    session: Session, source: m.ScheduleSource, prepared: PreparedImport
) -> tuple[m.ScheduleImport, int]:
    """Записывает подготовленный импорт и делает его актуальным.
    Вызывать внутри транзакции/savepoint; source.id и source.program_id должны существовать."""
    now = utcnow()

    imp = m.ScheduleImport(
        source_id=source.id,
        content_hash=prepared.content_hash,
        status="success",
        is_current=False,
        module=prepared.module,
        academic_year=prepared.academic_year,
        period_start=prepared.period_start,
        period_end=prepared.period_end,
        groups_count=prepared.groups_count,
        lessons_count=prepared.lessons_count,
        notes_count=prepared.notes_count,
        warnings_count=prepared.warnings_count,
        errors_count=prepared.errors_count,
        warnings=prepared.warnings,
        finished_at=now,
    )
    session.add(imp)
    session.flush()

    group_ids = _upsert_groups(session, source.program_id, prepared.schedules)
    _upsert_buildings(session, prepared.schedules)

    # --- занятия -----------------------------------------------------------
    pairs: list[tuple[m.Lesson, bool]] = []
    for schedule in prepared.schedules:
        problem_cells = _date_problem_cells(schedule)
        for les in schedule.lessons:
            db_lesson = m.Lesson(
                import_id=imp.id,
                group_id=group_ids[les.group],
                day_of_week=_DAY_ISO[les.day_of_week],
                start_time=_to_time(les.start_time),
                end_time=_to_time(les.end_time),
                subject=les.subject,
                lesson_type=_cut(les.lesson_type, 64),
                teacher=les.teacher,
                room=_cut(les.room, 64),
                building=_cut(les.building, 32),
                online=bool(les.online),
                stream_group=_cut(les.stream_group, 128),
                subgroup=_cut(les.subgroup, 32),
                date_rule=les.dates.to_dict(),
                time_overrides=[t.to_dict() for t in les.time_overrides],
                raw_text=les.raw_text,
                source_cell=_cut(les.source_cell, 16),
            )
            pairs.append((db_lesson, les.source_cell in problem_cells))
    session.add_all([p[0] for p in pairs])
    session.flush()  # проставляет lesson.id

    # --- даты занятий ------------------------------------------------------
    rows: list[dict] = []
    for db_lesson, force_approx in pairs:
        for occ in expand_lesson(
            date_rule=db_lesson.date_rule,
            day_of_week=db_lesson.day_of_week,
            start_time=db_lesson.start_time,
            end_time=db_lesson.end_time,
            time_overrides=db_lesson.time_overrides,
            period_start=prepared.period_start,
            period_end=prepared.period_end,
            force_approximate=force_approx,
        ):
            rows.append(
                {
                    "lesson_id": db_lesson.id,
                    "group_id": db_lesson.group_id,
                    "date": occ.date,
                    "start_time": occ.start_time,
                    "end_time": occ.end_time,
                    "is_approximate": occ.is_approximate,
                }
            )
    for i in range(0, len(rows), OCCURRENCE_CHUNK):
        session.execute(insert(m.LessonOccurrence), rows[i:i + OCCURRENCE_CHUNK])

    # --- заметки -----------------------------------------------------------
    for schedule in prepared.schedules:
        for n in schedule.notes:
            session.add(
                m.ScheduleNote(
                    import_id=imp.id,
                    group_id=group_ids[n.group],
                    day_of_week=_DAY_ISO[n.day_of_week],
                    start_time=_to_time(n.start_time),
                    end_time=_to_time(n.end_time),
                    text=n.text,
                    source_cell=_cut(n.source_cell, 16),
                )
            )

    # --- переключение актуального импорта (сначала снимаем старый: partial unique index) ---
    session.execute(
        update(m.ScheduleImport)
        .where(m.ScheduleImport.source_id == source.id, m.ScheduleImport.is_current.is_(True))
        .values(is_current=False)
    )
    session.flush()
    imp.is_current = True
    session.flush()

    _apply_success_to_source(source, prepared, now)
    _cleanup_old_imports(session, source.id)
    return imp, len(rows)


# ---------------------------------------------------------------------------
# История отказов
# ---------------------------------------------------------------------------


def record_bad_import(
    session: Session,
    source: m.ScheduleSource,
    content_hash: str,
    status: str,                              # "rejected" | "failed"
    reason: str,
    prepared: Optional[PreparedImport] = None,
) -> None:
    session.add(
        m.ScheduleImport(
            source_id=source.id,
            content_hash=content_hash,
            status=status,
            is_current=False,
            module=prepared.module if prepared else None,
            academic_year=prepared.academic_year if prepared else None,
            period_start=prepared.period_start if prepared else None,
            period_end=prepared.period_end if prepared else None,
            groups_count=prepared.groups_count if prepared else 0,
            lessons_count=prepared.lessons_count if prepared else 0,
            notes_count=prepared.notes_count if prepared else 0,
            warnings_count=prepared.warnings_count if prepared else 0,
            errors_count=prepared.errors_count if prepared else 0,
            warnings=prepared.warnings if prepared else [],
            error=reason[:4000],
            finished_at=utcnow(),
        )
    )
    source.last_error = reason[:2000]
    _cleanup_old_imports(session, source.id)


# ---------------------------------------------------------------------------
# Обновление источника (cron)
# ---------------------------------------------------------------------------


def refresh_source(
    session: Session, source_id: int, api_key: str, *, force: bool = False
) -> ImportOutcome:
    source = session.execute(
        select(m.ScheduleSource).where(m.ScheduleSource.id == source_id).with_for_update(skip_locked=True)
    ).scalar_one_or_none()
    if source is None:
        return ImportOutcome("skipped", source_id, "источник не найден или уже обрабатывается другим процессом")
    if source.status != "active" and not force:
        return ImportOutcome("skipped", source_id, f"источник не активен (status={source.status})")

    now = utcnow()

    try:
        payload = fetch_payload(source.spreadsheet_id, api_key)
    except GoogleSheetsAPIError as exc:
        source.last_checked_at = now
        source.last_error = str(exc)[:2000]
        return ImportOutcome("failed", source_id, str(exc))

    source.last_checked_at = now

    if not force and source.last_hash == payload.content_hash:
        source.last_error = None
        return ImportOutcome("unchanged", source_id, "расписание не изменилось")

    last_import = session.scalars(
        select(m.ScheduleImport)
        .where(m.ScheduleImport.source_id == source_id)
        .order_by(m.ScheduleImport.started_at.desc(), m.ScheduleImport.id.desc())
        .limit(1)
    ).first()
    if (
        not force and last_import is not None
        and last_import.content_hash == payload.content_hash and last_import.status == "rejected"
    ):
        return ImportOutcome("rejected", source_id, f"это содержимое уже было отклонено: {last_import.error}")

    try:
        prepared = prepare_import(payload)
    except Exception as exc:  # noqa: BLE001 — любой сбой разбора не должен ронять весь cron
        record_bad_import(session, source, payload.content_hash, "failed", f"Ошибка разбора: {exc!r}")
        return ImportOutcome("failed", source_id, f"Ошибка разбора: {exc!r}")

    problem = "; ".join(prepared.critical[:5]) if prepared.critical else None
    if problem is None:
        current = session.scalars(
            select(m.ScheduleImport).where(
                m.ScheduleImport.source_id == source_id, m.ScheduleImport.is_current.is_(True)
            )
        ).first()
        problem = sanity_problem(current, prepared)
    if problem:
        record_bad_import(session, source, payload.content_hash, "rejected", problem, prepared)
        return ImportOutcome("rejected", source_id, problem, warnings=prepared.warnings_count)

    try:
        with session.begin_nested():
            imp, occ_count = write_import(session, source, prepared)
    except Exception as exc:  # noqa: BLE001
        record_bad_import(session, source, payload.content_hash, "failed", f"Ошибка записи: {exc!r}", prepared)
        return ImportOutcome("failed", source_id, f"Ошибка записи: {exc!r}")

    return ImportOutcome(
        "imported", source_id, "расписание обновлено", import_id=imp.id,
        groups=prepared.groups_count, lessons=prepared.lessons_count,
        occurrences=occ_count, warnings=prepared.warnings_count,
    )
