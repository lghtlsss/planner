from pydantic import BaseModel, Field
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
    name: str | None = None
    email: str | None = None
    password: str | None = Field(default=None, min_length=8)
    sleep_time_hours: int | None = Field(default=None, ge=0, le=12)
    go_to_sleep_time: time | None = None
    wake_up_time: int | None = Field(default=None, ge=0, le=23)
