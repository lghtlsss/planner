from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Routine, User
from app.enums import DayOfWeek
from app.schemas import SRoutineCreate, SRoutineUpdate
from datetime import time


def check_routine_accessibility(routine_id: int, current_user: User, db: Session):
    db_routine = db.get(Routine, routine_id)

    if db_routine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This routine does not exist")

    if db_routine.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to manage this routine")

    return db_routine


def get_routine_by_id_serv(routine_id: int, current_user: User, db: Session):
    return check_routine_accessibility(routine_id, current_user, db)


def get_all_routines_for_user(current_user: User, db: Session):
    routines = db.execute(
        select(Routine)
        .where(Routine.user_id == current_user.id)
        .order_by(Routine.start_time, Routine.title)
    ).scalars().all()
    return {"routines": routines}


def get_routine_by_day_serv(day: DayOfWeek, current_user: User, db: Session):
    routines = db.execute(
        select(Routine).where(
            Routine.user_id == current_user.id,
            Routine.days.contains([day]),
        )
    ).scalars().all()

    return {"routines": routines}


def _validate_routine(title: str, days: list[DayOfWeek], start_time: time, end_time: time):
    if not title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Routine title cannot be empty",
        )

    if not days:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Routine must include at least one day",
        )

    if len(days) != len(set(days)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Routine days cannot contain duplicates",
        )

    if start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Start time must be earlier than end time",
        )


def create_routine_serv(data: SRoutineCreate, current_user: User, db: Session):
    _validate_routine(data.title, data.days, data.start_time, data.end_time)

    new_routine = Routine(
        title=data.title,
        days=data.days,
        start_time=data.start_time,
        end_time=data.end_time,
        user_id=current_user.id,
    )

    db.add(new_routine)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(new_routine)
    return new_routine


def update_routine_serv(
    routine_id: int,
    data: SRoutineUpdate,
    current_user: User,
    db: Session,
):
    db_routine = check_routine_accessibility(routine_id, current_user, db)
    fields_to_update = data.model_dump(exclude_unset=True)

    if any(value is None for value in fields_to_update.values()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Routine fields cannot be null",
        )

    _validate_routine(
        fields_to_update.get("title", db_routine.title),
        fields_to_update.get("days", db_routine.days),
        fields_to_update.get("start_time", db_routine.start_time),
        fields_to_update.get("end_time", db_routine.end_time),
    )

    for key, value in fields_to_update.items():
        setattr(db_routine, key, value)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(db_routine)
    return db_routine


def delete_routine_serv(routine_id: int, current_user: User, db: Session):
    db_routine = check_routine_accessibility(routine_id, current_user, db)

    db.delete(db_routine)
    db.commit()

    return {"message": "Routine deleted successfully"}
