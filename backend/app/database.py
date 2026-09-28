from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

import os
from dotenv import load_dotenv

load_dotenv()


class Base(DeclarativeBase):
    pass


DB_URL = os.getenv("DATABASE_URL")

engine = create_engine(DB_URL)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
