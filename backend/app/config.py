"""Настройки приложения. .env ищется по абсолютным путям."""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILES = (
    _BACKEND_DIR.parent / ".env",
    _BACKEND_DIR / ".env",
    Path(".env"),
)

def to_psycopg_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILES, env_file_encoding="utf-8", extra="ignore")

    # --- БД ---
    database_url: str
    sql_echo: bool = False

    # --- авторизация ---
    jwt_secret: str
    jwt_access_token_expire_minutes: int
    jwt_algorithm: str

    # --- расписание ---
    google_sheets_api_key: Optional[str] = None
    refresh_interval_hours: int = 8                     # как часто планировщик обновляет расписания
    expiry_warning_days: int = 7                        # за сколько дней предупреждать об окончании модуля
    admin_token: Optional[str] = None                   # если задан — POST /sources требует X-Admin-Token
    cors_origins: list[str] = ["*"]                     # в .env — JSON: CORS_ORIGINS=["http://localhost:3000"]

    @property
    def sqlalchemy_url(self) -> str:
        return to_psycopg_url(self.database_url)


settings = Settings()
