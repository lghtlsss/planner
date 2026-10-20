"""
Планировщик: обновляет расписания каждые REFRESH_INTERVAL_HOURS часов (по умолчанию 8)
и раз в сутки проверяет окончание модулей. Работает как отдельный долгоживущий процесс
(например, отдельный сервис в docker-compose):

    python -m schedule_parser.jobs.scheduler        (из папки backend)

Вместо него можно запускать refresh_sources / check_expired из cron — они делают то же самое.
"""

import logging
import time

from app.config import settings

from . import check_expired, refresh_sources
from ..services.status import today_local

log = logging.getLogger("scheduler")
TICK_SECONDS = 60


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    interval = settings.refresh_interval_hours * 3600
    log.info("Планировщик запущен: обновление каждые %s ч, проверка модулей раз в сутки",
             settings.refresh_interval_hours)

    last_refresh = None        # time.monotonic() последнего обновления
    last_expiry_day = None     # дата последней проверки модулей

    while True:
        today = today_local()
        if last_expiry_day != today:
            try:
                check_expired.run()
            except Exception:
                log.exception("check_expired: ошибка")
            last_expiry_day = today

        if last_refresh is None or time.monotonic() - last_refresh >= interval:
            try:
                refresh_sources.run()
            except Exception:
                log.exception("refresh_sources: ошибка")
            last_refresh = time.monotonic()

        time.sleep(TICK_SECONDS)


if __name__ == "__main__":
    main()
