from fastapi import APIRouter, HTTPException

from app.database import Base, get_db

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.security import verify_password

router = APIRouter(prefix="auth", tags=["Auth"])


@router.get("/sign_up")
def sign_up():
    pass


@router.get("/sign_in")
def sign_in():
    pass


@router.get("/sign_out")
def sign_out():
    pass
