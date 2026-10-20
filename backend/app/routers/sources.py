from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.schemas.s_sources import AddSourceIn, AddSourceOut
from app.database import get_db
from app.config import settings
from schedule_parser.services.sources import add_source

router = APIRouter(tags=["sources"])


def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> None:
    """Если задан ADMIN_TOKEN — требуем его в заголовке X-Admin-Token."""
    if settings.admin_token and x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Неверный или отсутствующий X-Admin-Token")


@router.post(
    "/sources",
    response_model=AddSourceOut,
    status_code=201,
    dependencies=[Depends(require_admin)],
    responses={400: {"model": AddSourceOut, "description": "ссылку не удалось подключить (причина в message / errors)"}},
)
def create_source(body: AddSourceIn, response: Response, session: Session = Depends(get_db)):
    """Подключает ссылку на Google Таблицу с расписанием модуля.

    Ссылка сохраняется только если расписание скачалось, разобралось и записалось.
    Запрос может занять несколько секунд (скачивание и разбор таблицы).
    """
    api_key = settings.google_sheets_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="На сервере не задан GOOGLE_SHEETS_API_KEY")

    result = add_source(session, body.url, api_key, faculty=body.faculty, program=body.program)
    out = AddSourceOut(**result.__dict__)

    if not result.ok:
        session.rollback()
        return JSONResponse(status_code=400, content=jsonable_encoder(out))

    session.commit()
    if result.already_exists:
        response.status_code = 200
    return out
