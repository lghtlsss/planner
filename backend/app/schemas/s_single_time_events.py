from pydantic import BaseModel, model_validator
from datetime import time, date
from fastapi import HTTPException, status


def _validate_time_range(start_time, end_time):
    """Сверяет время начала и конца события"""
    if start_time is not None and end_time is not None:
        if start_time >= end_time:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail="Время начала должно быть раньше времени окончания")


class SEventCreate(BaseModel):
    name: str
    description: str | None = None
    start_time: time
    end_time: time
    event_date: date

    @model_validator(mode="after")
    def check_time_range(self):
        """
        Проверка, что событие начинается раньше, чем закончится
         при создании события
        """
        _validate_time_range(self.start_time, self.end_time)
        return self


class SEventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    start_time: time | None = None
    end_time: time | None = None
    event_date: date | None = None

    @model_validator(mode="after")
    def check_time_range(self):
        """
        Проверка, что событие начинается раньше, чем закончится
         при обновлении данных события
        """
        _validate_time_range(self.start_time, self.end_time)
        return self


class SEventResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    start_time: time
    end_time: time | None
    event_date: date

    model_config = {
        "from_attributes": True
    }


class SListEventResponse(BaseModel):
    events: list[SEventResponse]
