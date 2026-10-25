from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Date, Time
from datetime import date, time
from app.database import Base


class Task(Base):
    """Задачи, добавляющиеся на день из дедлайнов."""
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True)
    title: Mapped[str] = mapped_column(
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

    start_time: Mapped[time] = mapped_column(Time, nullable=False)

    potential_end_time: Mapped[time] = mapped_column(Time, nullable=False)

    task_date: Mapped[date] = mapped_column(
        Date,
        nullable=False)

    deadline_id: Mapped[int] = mapped_column(
        ForeignKey("deadlines.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="tasks")
