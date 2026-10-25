from pydantic import BaseModel, Field
from app.enums import DayOfWeek
from datetime import time


class SRoutineCreate(BaseModel):
    title: str
    days: list[DayOfWeek]
    start_time: time
    end_time: time


class SRoutineUpdate(BaseModel):
    title: str | None = None
    days: list[DayOfWeek] | None = None
    start_time: time | None = None
    end_time: time | None = None


class SRoutineResponse(BaseModel):
    id: int
    title: str
    days: list[DayOfWeek]
    start_time: time
    end_time: time

    model_config = {"from_attributes": True}


class SRoutinesListResponse(BaseModel):
    routines: list[SRoutineResponse]
