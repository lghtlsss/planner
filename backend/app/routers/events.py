from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import User
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Event
from app.schemas import SEventCreate, SEventResponse, SEventUpdate, SListEventResponse, SEventCreateResponse

from app.services import create_event_service, delete_event_service, get_single_event_service, update_event_service

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/all", response_model=SListEventResponse)
def get_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"events": db.execute(select(Event).where(Event.user_id == current_user.id)).scalars().all()}


@router.get("/{event_id}", response_model=SEventResponse)
def get_single_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_single_event_service(event_id, current_user, db)


@router.post("", response_model=SEventCreateResponse)
def create_event(data: SEventCreate, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    return create_event_service(data, current_user, db)


@router.delete("/delete/{event_id}")
def delete_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return delete_event_service(event_id, current_user, db)


@router.patch("/update/{event_id}")
def update_event(data: SEventUpdate, event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_event_service(event_id, current_user, data, db)
