from pydantic import BaseModel, Field, field_validator
from datetime import time
from .s_auth import SToken


class SUserResponse(BaseModel):
    name: str | None = None
    email: str
    group_id: int | None = None
    go_to_sleep_time: time | None = None
    wake_up_time: time | None = None
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
    group_id: int | None = None
    go_to_sleep_time: time | None = None
    wake_up_time: time | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        if not value:
            raise ValueError("Имя не может состоять из пробелов")

        return value

    @field_validator("email", "password")
    @classmethod
    def credentials_must_not_be_null(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Это поле нельзя очистить")
        return value
