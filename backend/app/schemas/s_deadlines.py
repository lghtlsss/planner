from pydantic import BaseModel
from app.enums import Difficulty
from datetime import date


class SDeadlineCreate(BaseModel):
    title: str
    description: str | None = None
    expire_date: date | None = None
    repeat: bool = False
    difficulty: Difficulty | None = None
    tag: str | None = None
    send_notification: bool = False


class SDeadlineResponse(BaseModel):
    title: str
    description: str | None
    expire_date: date | None
    repeat: bool
    difficulty: Difficulty | None
    tag: str | None
    send_notification: bool


class SDeadlineListResponse(BaseModel):
    deadlines: list[SDeadlineResponse]


class SDeadlineUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    expire_date: date | None = None
    repeat: bool | None = None
    difficulty: Difficulty | None = None
    tag: str | None = None
    send_notification: bool | None = None
