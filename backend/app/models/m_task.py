from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, ForeignKey, DateTime, Date, Time
from datetime import datetime, timezone, date, time
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True)
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )
    potential_duration: Mapped[int | None] = mapped_column(
        nullable=True)  # в минутах
    actual_duration: Mapped[int | None] = mapped_column(nullable=True, default=None)  # в минутах

    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    potential_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    task_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True)

    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                               nullable=False)

    creation_time: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                    default=lambda: datetime.now(timezone.utc),
                                                    nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="tasks")
