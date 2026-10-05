from app.database import Base

from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy import String, Date, Boolean, ForeignKey

from datetime import date
from sqlalchemy import Enum as SQLEnum
from app.enums import Difficulty


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(
        autoincrement=True,
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    expire_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    repeat: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )

    difficulty: Mapped[Difficulty | None] = mapped_column(
        SQLEnum(Difficulty),
        nullable=True
    )

    tag: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    send_notification: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    comment: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        default=None
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    user: Mapped["User"] = relationship(
        back_populates="deadlines"
    )
