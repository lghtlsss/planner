from fastapi import HTTPException, status
from app.models import User
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Event
from app.schemas import SEventCreate


def create_event_service(data: SEventCreate, user: User, db: Session):
    """
    Создаёт событие.
    Перед этим производится проверка, не существует ли уже такое событие
        и не пересечётся ли новое событие с уже запланированными.
    """
    do_event_exists = db.execute(select(Event).where(
        Event.date == data.date,
        Event.start_time == data.start_time,
        Event.user_id == user.id
    )).scalar_one_or_none()

    if do_event_exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="У вас уже есть событие на это время"
                            )

    events_intersection = db.execute(select(Event).where(
        Event.user_id == user.id,
        Event.date == data.date,
        Event.start_time < data.potential_end_time,
        Event.potential_end_time > data.start_time
    )).scalar_one_or_none()
    intersection_flag = False
    if events_intersection is not None:
        intersection_flag = True

    new_event = Event(
        name=data.name,
        description=data.description,
        potential_duration=data.potential_duration,
        start_time=data.start_time,
        potential_end_time=data.potential_end_time,
        date=data.date,
        user_id=user.id
    )

    try:
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
    except Exception as e:
        db.rollback()
        raise e

    return {"event": new_event, "intersection": intersection_flag}


def delete_event_service(event_id: int, user: User, db: Session):
    """
    Удаление события по id.
    Проводится проверка на существование события и на право удаления этого события пользователем
    """
    event_to_del = db.get(Event, event_id)

    if event_to_del is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event_to_del.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to delete this event")

    db.delete(event_to_del)
    db.commit()

    return {"message": "ok"}


def get_single_event_service(event_id: int, user: User, db: Session):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if event.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not allowed to see this event")

    return event
