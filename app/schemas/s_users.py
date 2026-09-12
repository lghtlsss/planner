from pydantic import BaseModel


class SUserCreate(BaseModel):
    name: str
    surname: str
    password: str


class SUserResponse(BaseModel):
    name: str
    surname: str

    model_config = {
        "from_attributes": True
    }


class SUserUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None
