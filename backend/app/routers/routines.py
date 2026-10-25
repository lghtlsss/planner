from fastapi import APIRouter, Depends
from app.database import get_db
from sqlalchemy.orm import Session
from app.schemas import SRoutineCreate, SRoutineResponse, SRoutineUpdate, SRoutinesListResponse
from app.models import User
from app.dependencies import get_current_user
from app.enums import DayOfWeek
from app.services import (
    create_routine_serv,
    delete_routine_serv,
    get_all_routines_for_user,
    get_routine_by_day_serv,
    get_routine_by_id_serv,
    update_routine_serv,
)

router = APIRouter(prefix="/routines", tags=["Routines"])


@router.get("", response_model=SRoutinesListResponse)
def get_all_routines(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_all_routines_for_user(current_user, db)


@router.get("/by_id/{routine_id}", response_model=SRoutineResponse)
def get_routine_by_id(routine_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_routine_by_id_serv(routine_id, current_user, db)


@router.get("/by_day", response_model=SRoutinesListResponse)
def get_routine_by_day(day: DayOfWeek, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_routine_by_day_serv(day, current_user, db)


@router.post("/create", response_model=SRoutineResponse)
def create_routines(data: SRoutineCreate, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    return create_routine_serv(data, current_user, db)


@router.delete("/{routine_id}")
def delete_routine(routine_id: int, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    return delete_routine_serv(routine_id, current_user, db)


@router.patch("/{routine_id}", response_model=SRoutineResponse)
def update_routine(routine_id: int, data: SRoutineUpdate, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    return update_routine_serv(routine_id, data, current_user, db)
