import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class FacultyOut(BaseModel):
    id: int
    name: str


class ProgramLinkOut(BaseModel):
    """Состояние ссылки на расписание программы."""

    state: str = Field(description="ok | expiring | needs_new_link")
    needs_new_link: bool = Field(description="активной ссылки нет или модуль закончился — попросите новую ссылку")
    expiring_soon: bool = Field(description="модуль скоро закончится")
    days_left: Optional[int] = Field(None, description="дней до конца модуля (отрицательное — уже закончился)")
    period_end: Optional[dt.date] = None
    module: Optional[int] = None
    source_id: Optional[int] = None


class ProgramOut(BaseModel):
    id: int
    faculty_id: int
    faculty: str
    degree: str
    name: str
    label: str
    link: ProgramLinkOut


class ProgramStatusOut(ProgramLinkOut):
    program_id: int
    faculty: str
    program: str


class GroupOut(BaseModel):
    id: int
    name: str
    course: int
    stream_label: Optional[str] = None
    program_id: int
    program: str
    faculty_id: int
    faculty: str
