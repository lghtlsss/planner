from pydantic import BaseModel

class SJWT(BaseModel):
    access_token: str
    token_type: str

