"""
Сборка ParsedSchedule из RawSheet — общая для CLI (main.py) и сервисов БД.
"""

from __future__ import annotations

from datetime import date

from .models import (
    Building,
    Group,
    ParsedSchedule,
    ParseWarning,
    ScheduleMetadata,
    WarningSeverity,
)
from .normalizer import normalize_cell, resolve_year
from .parser import RawSheet
from .validators import validate_schedule


def build_schedule_from_raw(raw: RawSheet, academic_year_start: int) -> ParsedSchedule:
    """Единая точка сборки ParsedSchedule из уже извлечённой структуры
    (RawSheet) — общая для xlsx-пути и API-пути, дальше они ничем не
    отличаются."""
    faculty = raw.meta.faculty or "Не указан"
    program = raw.meta.program or "Не указана"

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
                program=program,
                faculty=faculty,
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
        faculty=faculty,
        program=program,
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
