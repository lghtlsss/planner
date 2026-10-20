import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.s_catalog import GroupOut


class LessonOut(BaseModel):
    start_time: str
    end_time: str
    subject: Optional[str] = None
    lesson_type: Optional[str] = None
    teacher: Optional[str] = None
    room: Optional[str] = None
    building: Optional[str] = None
    building_address: Optional[str] = None
    online: bool = False
    stream_group: Optional[str] = None
    subgroup: Optional[str] = None
    is_approximate: bool = Field(False, description="даты занятия определены приблизительно — «даты уточняйте»")


class NoteOut(BaseModel):
    start_time: str
    end_time: str
    text: str


class DayOut(BaseModel):
    date: dt.date
    weekday: int = Field(description="ISO: 1 = понедельник")
    weekday_short: str
    lessons: list[LessonOut]
    notes: list[NoteOut]


class ScheduleMetaOut(BaseModel):
    stream_groups_available: list[str]
    subgroups_available: list[str]
    has_approximate: bool


class ScheduleOut(BaseModel):
    group: GroupOut
    date_from: dt.date
    date_to: dt.date
    days: list[DayOut]
    meta: ScheduleMetaOut
