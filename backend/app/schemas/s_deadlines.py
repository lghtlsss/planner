from pydantic import BaseModel
from app.enums import Difficulty
from datetime import datetime


class SDeadlineCreate(BaseModel):
    title: str
    description: str | None = None
    expire_date: datetime | None = None
    repeat: bool = False
    difficulty: Difficulty | None = None
    tag: str | None = None
    send_notification: bool = False
    comment: str | None = None


class SDeadlineResponse(BaseModel):
    id: int
    title: str
    description: str | None
    expire_date: datetime | None
    repeat: bool
    difficulty: Difficulty | None
    tag: str | None
    send_notification: bool
    comment: str | None
    completed: bool
    completed_at: datetime | None


class SDeadlineListResponse(BaseModel):
    deadlines: list[SDeadlineResponse]


class SDeadlineUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    expire_date: datetime | None = None
    repeat: bool | None = None
    difficulty: Difficulty | None = None
    tag: str | None = None
    send_notification: bool | None = None
    comment: str | None = None
    completed: bool | None = None
    completed_at: datetime | None = None
