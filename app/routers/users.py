from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import User

from app.schemas.s_users import SUserCreate, SUserUpdate, SUserResponse

from app.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
def get_users(db: Session = Depends(get_db)):
    return db.execute(select(User)).scalars().all()


@router.get("{user_id}", response_model=SUserResponse)
def get_single_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.get(User, user_id)
    if db_user is None:
        return HTTPException(404, "User not fund")

    return db_user


@router.post("", response_model=SUserResponse)
def create_user(user: SUserCreate, db: Session = Depends(get_db)):
    db_user = User(name=user.name,
                   surname=user.surname,
                   hashed_password=hash_password(user.password))

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.patch("{user_id}", response_model=SUserResponse)
def update_user(user_id: int, data: SUserUpdate, db: Session = Depends(get_db)):
    db_user = db.get(User, user_id)
    if db_user is None:
        return HTTPException(404, "User not fund")

    to_update = data.model_dump(exclude_none=True)

    for key, value in to_update.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)

    return db_user


@router.delete("{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.get(User, user_id)
    if db_user is None:
        return HTTPException(404, "User not found")

    db.delete(db_user)
    db.commit()

    return {"message": "successfully deleted"}


# TODO: сделать авторизацию, аутентификацию