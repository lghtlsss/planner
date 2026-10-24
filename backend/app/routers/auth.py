from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.models import User

from app.schemas import SUserCreate, SUserCreateResponse, SToken

from app.security import hash_password, verify_password

from datetime import datetime, timedelta, timezone

from jose import jwt

from fastapi.security import OAuth2PasswordRequestForm

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


@router.post("/register", response_model=SUserCreateResponse)
def register(new_user: SUserCreate, db: Session = Depends(get_db)):
    test_user = db.execute(select(User).where(User.email == new_user.email)).scalar_one_or_none()

    if test_user:
        raise HTTPException(400, "User with this email already exists")

    db_user = User(email=new_user.email,
                   hashed_password=hash_password(new_user.password))

    db.add(db_user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists") from exc
    db.refresh(db_user)

    access_token = create_access_token(db_user.id)

    return {
        "user": db_user,
        "token": {
            "access_token": access_token,
            "token_type": "bearer"
        }
    }


@router.post("/login", response_model=SToken)
def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.execute(select(User).where(User.email == credentials.username)).scalar_one_or_none()

    if db_user is None:
        raise HTTPException(401, "Invalid email or password")

    if not verify_password(credentials.password, db_user.hashed_password):
        raise HTTPException(401, "Invalid email or password")

    access_token = create_access_token(db_user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
