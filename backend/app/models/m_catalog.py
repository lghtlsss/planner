"""Справочники расписания: факультеты, программы, группы, корпуса."""

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


def _created_at() -> Mapped[dt.datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Faculty(Base):
    __tablename__ = "faculties"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[dt.datetime] = _created_at()

    programs: Mapped[list["Program"]] = relationship(back_populates="faculty", passive_deletes=True)


class Program(Base):
    __tablename__ = "programs"
    __table_args__ = (
        UniqueConstraint("faculty_id", "degree", "name", name="uq_programs_faculty_degree_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculties.id", ondelete="CASCADE"), index=True)
    degree: Mapped[str] = mapped_column(String(8))          # БАК / МАГ / СПЕЦ / АСП
    name: Mapped[str] = mapped_column(String(255))          # "Юриспруденция"
    created_at: Mapped[dt.datetime] = _created_at()

    faculty: Mapped[Faculty] = relationship(back_populates="programs")
    groups: Mapped[list["Group"]] = relationship(back_populates="program", passive_deletes=True)
    sources: Mapped[list["ScheduleSource"]] = relationship(back_populates="program", passive_deletes=True)


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = (UniqueConstraint("program_id", "name", name="uq_groups_program_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128))          # "26КНТ-1"
    course: Mapped[int] = mapped_column(SmallInteger, default=0)
    stream_label: Mapped[Optional[str]] = mapped_column(String(512))   # "I ПОТОК" / "Специализация ..."
    created_at: Mapped[dt.datetime] = _created_at()
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    program: Mapped[Program] = relationship(back_populates="groups")


class Building(Base):
    """Справочник корпусов (код -> адрес), берётся из шапки листов."""

    __tablename__ = "buildings"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    address: Mapped[Optional[str]] = mapped_column(Text)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
