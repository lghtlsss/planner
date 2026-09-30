from pydantic import BaseModel
from datetime import datetime, time, date


class SEventCreate(BaseModel):
    name: str
    description: str | None = None
    start_time: time
    end_time: time
    event_date: date


class SEventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    event_date: date | None = None


class SEventResponse(BaseModel):
    id: int
    name: str
    description: str | None
    start_time: time
    end_time: time
    event_date: date

    model_config = {
        "from_attributes": True
    }


class SListEventResponse(BaseModel):
    events: list[SEventResponse]


class SEventCreateResponse(BaseModel):
    event: SEventResponse
    intersection: bool
