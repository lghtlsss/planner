from pydantic import BaseModel


class SUserCreate(BaseModel):
    name: str
    surname: str
    email: str
    password: str


class SUserResponse(BaseModel):
    name: str
    surname: str
    email: str

    model_config = {
        "from_attributes": True
    }


class SUserUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None
