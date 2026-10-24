from pydantic import BaseModel, Field, field_validator
from datetime import time
from .s_auth import SToken


class SUserResponse(BaseModel):
    name: str | None = None
    email: str
    sleep_time_hours: int | None = Field(default=None, ge=0, le=12)
    go_to_sleep_time: time | None = None
    wake_up_time: int | None = Field(default=None, ge=0, le=23)
    profile_completed: bool

    model_config = {
        "from_attributes": True
    }


class SUserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)


class SUserCreateResponse(BaseModel):
    user: SUserResponse
    token: SToken


class SUserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2)
    email: str | None = None
    password: str | None = Field(default=None, min_length=8)
    sleep_time_hours: int | None = Field(default=None, ge=0, le=12)
    go_to_sleep_time: time | None = None
    wake_up_time: int | None = Field(default=None, ge=0, le=23)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        if not value:
            raise ValueError("Имя не может состоять из пробелов")

        return value
