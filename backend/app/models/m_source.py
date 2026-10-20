"""Источники расписания (ссылки на Google Таблицы) и история импортов."""

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
    from app.models.m_catalog import Program
    from app.models.m_lesson import Lesson


def _created_at() -> Mapped[dt.datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


SOURCE_STATUSES = ("active", "expired", "replaced", "disabled")
IMPORT_STATUSES = ("success", "rejected", "failed")


class ScheduleSource(Base):
    """Ссылка на Google Таблицу с расписанием одного модуля одной программы.
    Сохраняется только после успешного пробного парсинга."""

    __tablename__ = "schedule_sources"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','expired','replaced','disabled')", name="status_valid"
        ),
        Index("ix_schedule_sources_status_period_end", "status", "period_end"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(Text)
    spreadsheet_id: Mapped[str] = mapped_column(String(128), unique=True)
    title: Mapped[Optional[str]] = mapped_column(Text)

    # active — опрашивается; expired — модуль закончился; replaced — программа получила
    # новую ссылку; disabled — отключён вручную
    status: Mapped[str] = mapped_column(String(16), default="active", server_default="active")

    module: Mapped[Optional[int]] = mapped_column(SmallInteger)
    academic_year: Mapped[Optional[int]] = mapped_column(SmallInteger)   # год начала учебного года
    period_start: Mapped[Optional[dt.date]] = mapped_column(Date)
    period_end: Mapped[Optional[dt.date]] = mapped_column(Date)

    last_hash: Mapped[Optional[str]] = mapped_column(String(64))
    last_checked_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[dt.datetime] = _created_at()
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    program: Mapped[Program] = relationship(back_populates="sources")
    imports: Mapped[list["ScheduleImport"]] = relationship(
        back_populates="source", passive_deletes=True, order_by="ScheduleImport.started_at.desc()"
    )


class ScheduleImport(Base):
    """Один запуск импорта. is_current = true у последнего успешного импорта источника."""

    __tablename__ = "schedule_imports"
    __table_args__ = (
        CheckConstraint("status IN ('success','rejected','failed')", name="status_valid"),
        Index("ix_schedule_imports_source_started", "source_id", "started_at"),
        # не больше одного актуального импорта на источник
        Index(
            "uq_schedule_imports_current_per_source",
            "source_id",
            unique=True,
            postgresql_where=text("is_current"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("schedule_sources.id", ondelete="CASCADE"))
    content_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))

    module: Mapped[Optional[int]] = mapped_column(SmallInteger)
    academic_year: Mapped[Optional[int]] = mapped_column(SmallInteger)
    period_start: Mapped[Optional[dt.date]] = mapped_column(Date)
    period_end: Mapped[Optional[dt.date]] = mapped_column(Date)

    groups_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    lessons_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    notes_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    warnings_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    errors_count: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    # компактный список предупреждений парсера (с потолком по размеру — режет importer)
    warnings: Mapped[list] = mapped_column(JSONB, server_default=text("'[]'::jsonb"))
    error: Mapped[Optional[str]] = mapped_column(Text)   # причина rejected / failed

    started_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))

    source: Mapped[ScheduleSource] = relationship(back_populates="imports")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="schedule_import", passive_deletes=True)
