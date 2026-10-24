from fastapi import APIRouter, Depends

from app.database import get_db
from sqlalchemy.orm import Session

from app.schemas.s_users import SUserUpdate, SUserResponse
from app.dependencies import get_current_user
from app.services import user_update_serv

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=SUserResponse)
def get_single_user(
    current_user=Depends(get_current_user)
):
    return current_user


@router.patch("/me", response_model=SUserResponse)
def update_user(data: SUserUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return user_update_serv(data, current_user, db)


@router.delete("/me")
def delete_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()

    return {"message": "account successfully deleted"}
