from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import String, ForeignKey, ARRAY, Enum as SQLEnum, Time
from app.database import Base
from app.enums import DayOfWeek
from datetime import time


class Routine(Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(
        autoincrement=True,
        nullable=False,
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    days: Mapped[list[DayOfWeek]] = mapped_column(
        ARRAY(SQLEnum(
            DayOfWeek,
            name="day_of_week",
            values_callable=lambda enum: [day.value for day in enum],
        )),
        nullable=False,
    )

    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    user: Mapped["User"] = relationship(back_populates="routines")
