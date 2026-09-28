from pydantic_settings import BaseSettings, SettingsConfigDict

import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    jwt_secret: str
    jwt_access_token_expire_minutes: int
    jwt_algorithm: str
    google_sheets_api_key: str


settings = Settings(jwt_secret=os.getenv('JWT_SECRET'),
                    jwt_access_token_expire_minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES')),
                    jwt_algorithm=os.getenv("JWT_ALGORITHM"),
                    google_sheets_api_key=os.getenv("GOOGLE_SHEETS_API_KEY"))
