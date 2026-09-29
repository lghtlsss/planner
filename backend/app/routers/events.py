from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import User
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import Event
from app.schemas import SEventCreate, SEventResponse, SEventUpdate, SListEventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=SListEventResponse)
def get_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.execute(select(Event).where(Event.user_id == current_user.id))


@router.post("", response_model=SEventResponse)
def create_event(data: SEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pass
