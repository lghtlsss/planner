import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field


class AddSourceIn(BaseModel):
    url: str = Field(min_length=10, description="ссылка на Google Таблицу с расписанием модуля")
    faculty: Optional[str] = Field(None, description="если не определяется из названия таблицы")
    program: Optional[str] = Field(None, description='например: БАК "Юриспруденция"')


class AddSourceOut(BaseModel):
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
    errors: list[str] = []
