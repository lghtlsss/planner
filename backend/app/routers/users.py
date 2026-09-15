from fastapi import APIRouter, Depends

from backend.app.database import get_db
from sqlalchemy.orm import Session

from backend.app.schemas.s_users import SUserUpdate, SUserResponse
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


# Это будет иметь смысл только если делать admin-панель
# @router.get("")
# def get_users(db: Session = Depends(get_db)):
#     return db.execute(select(User)).scalars().all()


@router.get("/me", response_model=SUserResponse)
def get_single_user(
    current_user=Depends(get_current_user)
):
    return current_user


@router.patch("/me", response_model=SUserResponse)
def update_user(data: SUserUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    to_update = data.model_dump(exclude_none=True)

    for key, value in to_update.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me")
def delete_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()

    return {"message": "account successfully deleted"}
