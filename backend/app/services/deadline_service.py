from app.models import Deadline, User
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.schemas import SDeadlineCreate, SDeadlineUpdate
from fastapi import HTTPException, status
from datetime import date


def get_deadline_for_user(user: User, dd_id, db: Session):
    db_dd = db.get(Deadline, dd_id)

    if db_dd is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")

    if db_dd.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to see this deadline")

    return db_dd


def get_all_deadlines_for_user(user: User, db: Session):
    """
    Возвращает все дедлайны которые есть у пользователя
    """
    db_dd = db.execute(select(Deadline).where(
        Deadline.user_id == user.id
    )).scalars().all()

    return {"deadlines": db_dd}


def get_all_deadlines_by_expire_date(dd_date: date, db: Session, user: User):
    """
    Возвращает все дедлайны пользователя за конкретную дату
    """
    db_dd = db.execute(select(Deadline).where(
        Deadline.user_id == user.id,
        Deadline.expire_date == dd_date,
    )).scalars().all()

    return {"deadlines": db_dd}


def delete_deadline_by_id(dd_id: int, db: Session, user: User):
    db_dd = get_deadline_for_user(user, dd_id, db)

    db.delete(db_dd)
    db.commit()

    return {"message": "success"}


def update_deadline_by_id(data: SDeadlineUpdate, dd_id: int, db: Session, user: User):
    db_dd = get_deadline_for_user(user, dd_id, db)

    to_update = data.model_dump()

    for key, value in to_update.items():
        setattr(db_dd, key, value)

    db.commit()
    db.refresh(db_dd)

    return db_dd


def create_deadline(data: SDeadlineCreate, user, db: Session):
    new_dd = Deadline(
        title=data.title,
        description=data.description,
        expire_date=data.expire_date,
        repeat=data.repeat,
        difficulty=data.difficulty,
        tag=data.tag,
        send_notification=data.send_notification,
        user_id=user.id
    )

    db.add(new_dd)
    db.commit()
    db.refresh(new_dd)

    return new_dd
