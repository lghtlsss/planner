from app.schemas import STaskCreate, STaskUpdate
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Task, User, Deadline
from datetime import date


def check_task_accessibility(task_id: int, current_user: User, db: Session):
    db_task = db.get(Task, task_id)

    if db_task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if db_task.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to manage this task")

    return db_task


def check_deadline(deadline_id: int, current_user: User, db: Session):
    db_dd = db.get(Deadline, deadline_id)

    if db_dd is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")

    if db_dd.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to manage this deadline")


def get_task_serv(task_id: int, current_user: User, db: Session):
    return check_task_accessibility(task_id, current_user, db)


def delete_task_serv(task_id: int, current_user: User, db: Session):
    db_task = check_task_accessibility(task_id, current_user, db)

    db.delete(db_task)
    db.commit()

    return {"message": "Task deleted successfully"}


def create_task_serv(data: STaskCreate, current_user: User, db: Session):
    check_deadline(data.deadline_id, current_user, db)

    new_task = Task(
        title=data.title,
        description=data.description,
        start_time=data.start_time,
        potential_end_time=data.potential_end_time,
        task_date=data.task_date,
        deadline_id=data.deadline_id,
        user_id=current_user.id
    )

    db.add(new_task)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task already exists") from exc
    db.refresh(new_task)

    return new_task


def update_task_serv(task_id: int, data: STaskUpdate, current_user: User, db: Session):
    db_task = check_task_accessibility(task_id, current_user, db)

    fields_to_update = data.model_dump(exclude_unset=True)

    if "deadline_id" in fields_to_update:
        if fields_to_update["deadline_id"] is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="deadline_id cannot be null")
        check_deadline(fields_to_update["deadline_id"], current_user, db)

    for key, value in fields_to_update.items():
        setattr(db_task, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This deadline is already linked to another task") from exc

    db.refresh(db_task)
    return db_task


def get_task_by_date_serv(task_date: date, current_user: User, db: Session):
    return {"tasks": db.execute(
        select(Task).where(
            Task.task_date == task_date,
            Task.user_id == current_user.id,
        )
    ).scalars().all()}


def get_tasks_from_to_serv(start_date: date, end_date: date, current_user: User, db: Session):
    if start_date >= end_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Start date can not be later than end date")

    return {"tasks": db.execute(
        select(Task).where(
            Task.task_date >= start_date,
            Task.task_date <= end_date,
            Task.user_id == current_user.id
        )
    ).scalars().all()}
