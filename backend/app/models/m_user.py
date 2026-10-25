from sqlalchemy import String, Time, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import time
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True)

    hashed_password: Mapped[str] = mapped_column(nullable=False)

    name: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )
    group_id: Mapped[int | None] = mapped_column(nullable=True, default=None)
    go_to_sleep_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    wake_up_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    events: Mapped[list["Event"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    deadlines: Mapped[list["Deadline"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    routines: Mapped[list["Routine"]] = relationship(back_populates="user", cascade="all, delete-orphan")
