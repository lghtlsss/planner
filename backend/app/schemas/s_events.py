from pydantic import BaseModel
from datetime import datetime


class SEventCreate(BaseModel):
    name: str
    description: str | None
    potential_duration: int
    date: datetime
    start_time: datetime
    potential_end_time: datetime


class SEventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    potential_duration: int | None = None
    date: datetime | None = None
    start_time: datetime | None = None
    potential_end_time: datetime | None = None
    actual_duration: int | None = None


class SEventResponse(BaseModel):
    name: str
    description: str | None
    potential_duration: int
    date: datetime
    start_time: datetime
    potential_end_time: datetime
    actual_duration: int | None = None
    message: str | None = None

    model_config = {
        "from_attributes": True
    }


class SListEventResponse(BaseModel):
    events: list[SEventResponse]


class SEventCreateResponse(BaseModel):
    event: SEventResponse
    intersection: bool
