from pydantic import BaseModel


class SEventCreate(BaseModel):
    name: str
    description: str
    potential_duration: int
    date: str  # переделать под datetime


class SEventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    potential_duration: int | None = None
    date: str | None = None  # переделать под datetime


class SEventResponse(BaseModel):
    name: str
    description: str
    potential_duration: int
    date: str  # переделать под datetime

    model_config = {
        "from_attributes": True
    }
