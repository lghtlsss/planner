"""
Обновление расписаний по всем активным источникам.

    python -m schedule_parser.jobs.refresh_sources [--source-id N] [--force]   (из папки backend)

Каждый источник — в своей транзакции: сбой одного не мешает остальным.
Код возврата: 0 — ок, 1 — были сбои, 2 — не задан GOOGLE_SHEETS_API_KEY.
"""

import argparse
import logging
import sys
from collections import Counter
from typing import Optional

from sqlalchemy import or_, select

from app import models as m
from app.config import settings
from app.database import session_scope

from ..services.importer import refresh_source
from ..services.status import today_local

log = logging.getLogger("refresh_sources")


def _source_ids(only_id: Optional[int]) -> list[int]:
    if only_id is not None:
        return [only_id]
    today = today_local()
    with session_scope() as s:
        return list(
            s.scalars(
                select(m.ScheduleSource.id)
                .where(
                    m.ScheduleSource.status == "active",
                    or_(m.ScheduleSource.period_end.is_(None), m.ScheduleSource.period_end >= today),
                )
                .order_by(m.ScheduleSource.last_checked_at.asc().nulls_first(), m.ScheduleSource.id)
            )
        )


def run(source_id: Optional[int] = None, force: bool = False) -> int:
    api_key = settings.google_sheets_api_key
    if not api_key:
        log.error("Не задан GOOGLE_SHEETS_API_KEY.")
        return 2

    ids = _source_ids(source_id)
    log.info("Источников к обработке: %d", len(ids))
    counts: Counter = Counter()
    for sid in ids:
        try:
            with session_scope() as s:
                outcome = refresh_source(s, sid, api_key, force=force)
        except Exception:  # noqa: BLE001 — сбой одного источника не останавливает остальные
            log.exception("source %s: необработанная ошибка", sid)
            counts["crashed"] += 1
            continue

        counts[outcome.status] += 1
        if outcome.status == "imported":
            log.info("source %s: imported (групп=%d, занятий=%d, дат=%d, предупреждений=%d)",
                     sid, outcome.groups, outcome.lessons, outcome.occurrences, outcome.warnings)
        elif outcome.status in ("rejected", "failed"):
            log.warning("source %s: %s — %s", sid, outcome.status, outcome.message)
        else:
            log.info("source %s: %s — %s", sid, outcome.status, outcome.message)

    log.info("Итого: %s", dict(counts))
    return 1 if (counts["failed"] or counts["crashed"]) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Обновление расписаний по активным источникам")
    parser.add_argument("--source-id", type=int)
    parser.add_argument("--force", action="store_true", help="игнорировать хеш и пересобрать")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    return run(args.source_id, args.force)


if __name__ == "__main__":
    sys.exit(main())
