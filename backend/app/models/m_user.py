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
    sleep_time_hours: Mapped[int | None] = mapped_column(
        nullable=True
    )

    go_to_sleep_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    # wake_up_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    @property
    def wake_up_time(self) -> int | None:
        if self.go_to_sleep_time is None or self.sleep_time_hours is None:
            return None

        return (self.go_to_sleep_time.hour + self.sleep_time_hours) % 24

    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    events: Mapped[list["Event"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    deadlines: Mapped[list["Deadline"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    routines: Mapped[list["Routine"]] = relationship(back_populates="user", cascade="all, delete-orphan")
