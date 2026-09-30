from app.models import Deadline, User
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.schemas import SDeadlineCreate, SDeadlineResponse, SDeadlineListResponse, SDeadlineUpdate
from fastapi import HTTPException, status
from datetime import date


def get_deadline_for_user(user: User, dd_id, db: Session):
    db_dd = db.get(Deadline, dd_id)

    if db_dd is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")

    if db_dd.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to see this deadline")

    return db_dd


def get_all_deadlines_by_id(user: User, db: Session):
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




