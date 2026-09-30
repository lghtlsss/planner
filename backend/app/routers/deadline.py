from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/deadlines", tags=["Deadlines"])


@router.get("")
def get_all_deadlines():
    pass
