from fastapi import Depends, HTTPException

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import User

from app.database import Base, get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user
