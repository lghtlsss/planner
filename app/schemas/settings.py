from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_token: str


settings = Settings()
