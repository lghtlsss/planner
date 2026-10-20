"""Занятия (правило дат), конкретные даты занятий и заметки-заглушки."""

from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
    SmallInteger, String, Text, Time, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.m_catalog import Group
    from app.models.m_source import ScheduleImport


class Lesson(Base):
    """Занятие в том виде, как его разобрал парсер (правило дат, а не конкретные даты)."""

    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="day_of_week_range"),
        Index("ix_lessons_import_group", "import_id", "group_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    import_id: Mapped[int] = mapped_column(ForeignKey("schedule_imports.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))

    day_of_week: Mapped[int] = mapped_column(SmallInteger)      # ISO: 1 = понедельник
    start_time: Mapped[dt.time] = mapped_column(Time)
    end_time: Mapped[dt.time] = mapped_column(Time)

    subject: Mapped[Optional[str]] = mapped_column(Text)
    lesson_type: Mapped[Optional[str]] = mapped_column(String(64))
    teacher: Mapped[Optional[str]] = mapped_column(Text)
    room: Mapped[Optional[str]] = mapped_column(String(64))
    building: Mapped[Optional[str]] = mapped_column(String(32))
    online: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    stream_group: Mapped[Optional[str]] = mapped_column(String(128))
    subgroup: Mapped[Optional[str]] = mapped_column(String(32))

    # DateRule.to_dict() парсера: type / start_date / end_date / dates / excluded_dates / raw
    date_rule: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    # [{on_date, start_time, end_time}] — точечные переносы по времени
    time_overrides: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))

    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    source_cell: Mapped[Optional[str]] = mapped_column(String(16))

    schedule_import: Mapped[ScheduleImport] = relationship(back_populates="lessons")
    group: Mapped[Group] = relationship()
    occurrences: Mapped[list["LessonOccurrence"]] = relationship(
        back_populates="lesson", passive_deletes=True
    )


class LessonOccurrence(Base):
    """Конкретная дата проведения занятия. Запросы расписания идут по этой таблице."""

    __tablename__ = "lesson_occurrences"
    __table_args__ = (
        UniqueConstraint("lesson_id", "date", name="uq_lesson_occurrences_lesson_date"),
        Index("ix_lesson_occurrences_group_date", "group_id", "date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))  # дубль для скорости

    date: Mapped[dt.date] = mapped_column(Date)
    start_time: Mapped[dt.time] = mapped_column(Time)   # с учётом time_overrides
    end_time: Mapped[dt.time] = mapped_column(Time)
    # true — правило дат разобрать не удалось, занятие поставлено на каждую неделю
    # периода модуля в свой день недели («даты уточняйте»)
    is_approximate: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    lesson: Mapped[Lesson] = relationship(back_populates="occurrences")


class ScheduleNote(Base):
    """Заметки-заглушки вместо занятия («по расписанию дисциплины…», «ВОЕННАЯ КАФЕДРА»)."""

    __tablename__ = "schedule_notes"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 1 AND 7", name="day_of_week_range"),
        Index("ix_schedule_notes_import_group", "import_id", "group_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    import_id: Mapped[int] = mapped_column(ForeignKey("schedule_imports.id", ondelete="CASCADE"))
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    day_of_week: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[dt.time] = mapped_column(Time)
    end_time: Mapped[dt.time] = mapped_column(Time)
    text: Mapped[str] = mapped_column(Text)
    source_cell: Mapped[Optional[str]] = mapped_column(String(16))
