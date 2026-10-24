from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user
from app.database import get_db
from app.models import User, Task
from app.schemas import STaskUpdate, STaskCreate, STaskResponse, SListTaskResponse

from app.services import create_task_serv, delete_task_serv, get_task_serv, update_task_serv, get_task_by_date_serv
from datetime import date

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/by_id/{task_id}", response_model=STaskResponse)
def get_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_task_serv(task_id, current_user, db)


@router.get("/by_date", response_model=SListTaskResponse)
def get_task_by_date(task_date: date, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_task_by_date_serv(task_date, current_user, db)


@router.post("", response_model=STaskResponse)
def create_task(data: STaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return create_task_serv(data, current_user, db)


@router.patch("/{task_id}", response_model=STaskResponse)
def update_task(task_id: int, data: STaskUpdate, current_user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    return update_task_serv(task_id, data, current_user, db)


@router.delete("/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return delete_task_serv(task_id, current_user, db)
