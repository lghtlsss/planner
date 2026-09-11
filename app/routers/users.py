from fastapi import APIRouter, Depends

from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import User

from app.schemas import SUserCreate, SUserUpdate, SUserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def get_users(db: Session = Depends(get_db)):
    return db.execute(select(User)).scalars().all()


@router.post("", response_model=SUserResponse)
def create_user(user: SUserCreate, db: Session = Depends(get_db)):
    db_user = User(name=user.name,
                   surname=user.surname,
                   hashed_password=user.password)
    # del user["password"]
    # data = user.model_dump()
    #
    # for key, value in data.items():
    #     setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user
