from sqlalchemy import String
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
    surname: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    email: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True
    )

    events: Mapped[list["Event"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="user", cascade="all, delete-orphan")
