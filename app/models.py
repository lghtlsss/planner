from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True)

    hashed_password: Mapped[str] = mapped_column(nullable=False)

    name: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )
    surname: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    events:Mapped[list["Event"]] = relationship(back_populates="user")


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
    description: Mapped[str] = mapped_column(
        String(200),
        nullable=True
    )
    potential_duration: Mapped[int] = mapped_column(
        nullable=True)  # Пока что просто инт в минутах, позже можно поменять на datetime
    date: Mapped[str] = mapped_column(
        String(10),
        nullable=False)  # Пока что просто dd.mm.yyyy или dd.mm.yy, позже можно поменять на datetime

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user: Mapped["User"] = relationship(back_populates="events")
