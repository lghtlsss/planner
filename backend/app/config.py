from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    jwt_secret: str
    database_url: str
    jwt_access_token_expire_minutes: int
    jwt_algorithm: str
    google_sheets_api_key: str

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
