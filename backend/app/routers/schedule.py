import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.schemas.s_schedule import ScheduleOut
from app.database import get_db
from app.services.schedule_service import RangeError, get_schedule, resolve_range
from schedule_parser.services.status import today_local

router = APIRouter(tags=["schedule"])


@router.get("/schedule", response_model=ScheduleOut)
def read_schedule(
    group_id: int = Query(..., ge=1, description="id группы (из GET /groups)"),
    date_from: Optional[dt.date] = Query(None, description="начало периода; без параметров — текущая неделя"),
    date_to: Optional[dt.date] = Query(None, description="конец периода (максимум 62 дня)"),
    subgroup: Optional[str] = Query(
        None, description="подгруппа пользователя ('1', 'группа 1'): занятия других подгрупп скрываются"
    ),
    stream_groups: Optional[list[str]] = Query(
        None, description="коды потоков пользователя (повторяемый параметр): чужие коды потоков скрываются"
    ),
    session: Session = Depends(get_db),
):
    """Расписание группы за период, сгруппированное по дням (все даты периода, в т.ч. пустые)."""
    try:
        d_from, d_to = resolve_range(date_from, date_to, today_local())
    except RangeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result = get_schedule(session, group_id, d_from, d_to, subgroup=subgroup, stream_groups=stream_groups)
    if result is None:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    return result
