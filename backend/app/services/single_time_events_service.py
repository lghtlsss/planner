from fastapi import HTTPException, status
from app.models import User, Event
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.schemas import SEventCreate, SEventUpdate
from datetime import date


def create_event_service(data: SEventCreate, user: User, db: Session):
    """Создаёт событие."""
    new_event = Event(
        name=data.name,
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        event_date=data.event_date,
        user_id=user.id
    )

    try:
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
    except Exception as e:
        db.rollback()
        raise e

    return new_event


def get_event_for_user(event_id, user: User, db: Session) -> Event:
    """Находит событие и проверяет, может ли текущий пользователь с ним взаимодействовать.
     Если да то возвращает это событие"""
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if event.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to see this event")

    return event


def delete_event_service(event_id: int, user: User, db: Session):
    """
    Удаление события по id.
    Проводится проверка на существование события и на право удаления этого события пользователем
    """
    event_to_del = get_event_for_user(event_id, user, db)

    db.delete(event_to_del)
    db.commit()

    return {"message": "success"}


def get_single_event_service(event_id: int, user: User, db: Session) -> Event:
    """Возвращает событие по id"""
    return get_event_for_user(event_id, user, db)


def update_event_service(event_id: int, user: User, data: SEventUpdate, db: Session):
    """Обновление данных о событии."""
    curr_event = get_event_for_user(event_id, user, db)

    fields_to_update = data.model_dump(exclude_unset=True)

    start_time = fields_to_update.get("start_time", curr_event.start_time)
    end_time = fields_to_update.get("end_time", curr_event.end_time)
    if fields_to_update.get("name", curr_event.name) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Name cannot be null",
        )
    if start_time is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Start time cannot be null",
        )
    if fields_to_update.get("event_date", curr_event.event_date) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Event date cannot be null",
        )
    if end_time is not None and start_time >= end_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Start time must be earlier than end time",
        )

    for key, value in fields_to_update.items():
        setattr(curr_event, key, value)

    db.commit()
    db.refresh(curr_event)

    return curr_event


def get_events_by_date_serv(aim_date: date, user: User, db: Session):
    return {"events": db.execute(
        select(Event).where(
            Event.event_date == aim_date,
            Event.user_id == user.id
        )
    ).scalars().all()}
