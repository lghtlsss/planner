from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models import User
from app.schemas import SUserUpdate
from app.security import hash_password


def check_profile_completion(current_user: User):
    return bool(current_user.name and current_user.name.strip())


def user_update_serv(data: SUserUpdate, current_user: User, db: Session):
    to_update = data.model_dump(exclude_unset=True)
    password = to_update.pop("password", None)

    if password is not None:
        current_user.hashed_password = hash_password(password)

    for key, value in to_update.items():
        setattr(current_user, key, value)

    current_user.profile_completed = check_profile_completion(current_user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already in use",
        ) from exc

    db.refresh(current_user)

    return current_user
