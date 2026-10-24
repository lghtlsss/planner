from datetime import date, time
from pydantic import BaseModel, field_validator


class STaskCreate(BaseModel):
    title: str
    description: str | None = None
    start_time: time
    potential_end_time: time
    task_date: date
    deadline_id: int


class STaskResponse(BaseModel):
    id: int
    title: str
    description: str | None
    start_time: time
    potential_end_time: time
    task_date: date
    deadline_id: int


class STaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_time: time | None = None
    potential_end_time: time | None = None
    task_date: date | None = None
    deadline_id: int | None = None

    @field_validator(
        "title",
        "start_time",
        "potential_end_time",
        "task_date",
        "deadline_id",
        mode="before",
    )
    @classmethod
    def reject_null_for_required_fields(cls, value):
        if value is None:
            raise ValueError("Это поле нельзя очистить")
        return value


class SListTaskResponse(BaseModel):
    tasks: list[STaskResponse]
