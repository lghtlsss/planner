from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import SDeadlineResponse, SDeadlineCreate, SDeadlineListResponse, SDeadlineUpdate
from app.services import get_all_deadlines_for_user, get_all_deadlines_by_expire_date, get_deadline_for_user, \
    update_deadline_by_id, delete_deadline_by_id, create_deadline
from datetime import date

router = APIRouter(prefix="/deadlines", tags=["Deadlines"])


@router.get("/get/{dd_id}", response_model=SDeadlineResponse)
def get_dd_by_id(dd_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_deadline_for_user(current_user, dd_id, db)


@router.get("", response_model=SDeadlineListResponse)
def get_all_deadlines(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_all_deadlines_for_user(current_user, db)


@router.get("/bydate", response_model=SDeadlineListResponse)
def get_dd_by_date(dd_date: date, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return get_all_deadlines_by_expire_date(dd_date, db, current_user)


@router.delete("/delete/{dd_id}")
def delete_dd(
    dd_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return delete_deadline_by_id(dd_id, db, current_user)


@router.patch("/patch/{dd_id}", response_model=SDeadlineResponse)
def update_dd(
    dd_id: int,
    data: SDeadlineUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return update_deadline_by_id(data, dd_id, db, current_user)


@router.post("/create", response_model=SDeadlineResponse)
def create_dd(
    data: SDeadlineCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_deadline(data, current_user, db)
