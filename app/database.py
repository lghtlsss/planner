from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


class Base(DeclarativeBase):
    pass


DB_URL =  (
    "postgresql+psycopg://postgres:17563@localhost:5432/planner_db"
)

engine = create_engine(DB_URL)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
