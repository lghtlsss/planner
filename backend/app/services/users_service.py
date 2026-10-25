from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models import User
from app.schemas import SUserUpdate
from app.security import hash_password


def check_profile_completion(current_user: User):
    if any(
        value is None
        for value in (
                current_user.name,
                current_user.go_to_sleep_time,
                current_user.sleep_time_hours,
        )
    ):
        return False
    return True


def user_update_serv(data: SUserUpdate, current_user: User, db: Session):
    to_update = data.model_dump(exclude_unset=True)
    password = to_update.pop("password", None)
    requested_wake_up_time = to_update.pop("wake_up_time", None)

    bedtime = to_update.get("go_to_sleep_time", current_user.go_to_sleep_time)

    if requested_wake_up_time is not None:
        if bedtime is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Set go_to_sleep_time before setting wake_up_time",
            )

        derived_duration = (requested_wake_up_time - bedtime.hour) % 24
        if derived_duration > 12:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Wake-up time must be within 12 hours after bedtime",
            )
        if (
            "sleep_time_hours" in to_update
            and to_update["sleep_time_hours"] != derived_duration
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="wake_up_time conflicts with sleep_time_hours",
            )
        to_update["sleep_time_hours"] = derived_duration

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
