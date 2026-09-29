from fastapi import APIRouter, Depends

from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Event
from app.schemas.s_events import SEventResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/schedule", tags=["Schedule"])


@router.get("/", response_model=SEventResponse)
def get_schedule(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get the schedule for the current user.
    """
    events = db.execute(select(Event).where(Event.user_id == current_user.id))
    return {"events": events}
