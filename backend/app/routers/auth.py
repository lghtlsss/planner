from fastapi import APIRouter, Depends, HTTPException

from backend.app.config import settings
from backend.app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.models import User

from backend.app.schemas.s_users import SUserCreate, SUserResponse
from backend.app.schemas.s_auth import SToken, SLogin

from backend.app.security import hash_password, verify_password

from datetime import datetime, timedelta, timezone

from jose import jwt

router = APIRouter(prefix="/auth", tags=["Auth"])



def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )


@router.post("/register", response_model=SUserResponse)
def register(new_user: SUserCreate, db: Session = Depends(get_db)):
    test_user = db.execute(select(User).where(User.email == new_user.email)).scalar_one_or_none()

    if test_user:
        raise HTTPException(400, "User with this email already exists")

    db_user = User(name=new_user.name,
                   surname=new_user.surname,
                   email=new_user.email,
                   hashed_password=hash_password(new_user.password))

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post("/login", response_model=SToken)
def login(login_data: SLogin, db: Session = Depends(get_db)):
    db_user = db.execute(select(User).where(User.email == login_data.email)).scalar_one_or_none()

    if db_user is None:
        raise HTTPException(401, "Invalid email or password")

    if not verify_password(login_data.password, db_user.hashed_password):
        raise HTTPException(401, "Invalid email or password")

    access_token = create_access_token(db_user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/logout")
def logout():
    pass


def get_current_user(
        token: str = Depends()):
    pass
