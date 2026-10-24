from sqlalchemy.orm import Session
from app.models import User
from app.schemas import SUserUpdate


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
    to_update = data.model_dump(exclude_none=True)

    for key, value in to_update.items():
        setattr(current_user, key, value)

    current_user.profile_completed = check_profile_completion(current_user)

    db.commit()
    db.refresh(current_user)

    return current_user
