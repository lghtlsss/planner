from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.app.config import settings


class Base(DeclarativeBase):
    pass


DB_URL = settings.database_url

engine = create_engine(DB_URL)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
