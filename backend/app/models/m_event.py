from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime
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
    potential_duration: Mapped[int | None] = mapped_column(
        nullable=True)  # Пока что просто инт в минутах, позже можно поменять на datetime

    date: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False)

    creation_time: Mapped[datetime] = mapped_column(default=datetime.now())

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user: Mapped["User"] = relationship(back_populates="events")

