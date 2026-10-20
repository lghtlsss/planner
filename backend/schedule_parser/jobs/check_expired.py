"""
Проверка окончания модулей (раз в сутки).

    python -m schedule_parser.jobs.check_expired [--warn-days N]   (из папки backend)

Закончившиеся источники получают status = expired; выводится, каким программам
нужна новая ссылка (то же отдаёт GET /programs/{id}/status).
"""

import argparse
import logging
import sys
from typing import Optional

from app.config import settings
from app.database import session_scope

from ..services.status import all_program_statuses, expire_sources, today_local

log = logging.getLogger("check_expired")


def run(warn_days: Optional[int] = None) -> int:
    warn_days = settings.expiry_warning_days if warn_days is None else warn_days
    today = today_local()

    with session_scope() as s:
        for src in expire_sources(s, today):
            log.info("source %s (программа %s): модуль закончился %s -> expired",
                     src.id, src.program_id, src.period_end)

        needs = expiring = 0
        for st in all_program_statuses(s, today, warn_days):
            if st.state == "needs_new_link":
                needs += 1
                log.warning("%s / %s: нужна новая ссылка (дней до конца: %s)", st.faculty, st.program, st.days_left)
            elif st.state == "expiring":
                expiring += 1
                log.warning("%s / %s: модуль закончится через %s дн. (%s)",
                            st.faculty, st.program, st.days_left, st.period_end)

    log.info("Итого: нужна новая ссылка — %d, скоро закончатся — %d", needs, expiring)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверка окончания модулей")
    parser.add_argument("--warn-days", type=int)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    return run(args.warn_days)


if __name__ == "__main__":
    sys.exit(main())
