from datetime import datetime, timezone, date, time

from sqlalchemy import String, ForeignKey, DateTime, Date, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=True)

    event_date: Mapped[date] = mapped_column(
        Date,
        nullable=False)

    creation_time: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                    default=lambda: datetime.now(timezone.utc),
                                                    nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="events")
