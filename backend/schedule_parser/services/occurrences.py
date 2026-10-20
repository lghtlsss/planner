"""
Разворачивание правила дат занятия в конкретные даты (lesson_occurrences).

Чистая логика без БД: на вход — date_rule (DateRule.to_dict() парсера),
день недели (ISO 1..7), время и период модуля; на выход — список дат.

Правила:
- single / list     — перечисленные даты;
- range             — все нужные дни недели между start_date и end_date
                      (end_date=None -> до конца модуля) + отдельные даты, если есть;
- whole_period      — все нужные дни недели в периоде модуля;
- excluded_dates    — вычитаются;
- time_overrides    — подменяют время в конкретную дату.

Запасной вариант (is_approximate=True): если правило дат разобрать не удалось
(пустой список дат, дата-мусор, подозрительные предупреждения парсера, неизвестный
тип правила) — занятие ставится на КАЖДУЮ неделю периода модуля в свой день
недели, чтобы пара не терялась. Дата, явно указанная в правиле, но попавшая на
другой день недели, тоже помечается как приблизительная.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Iterable, Optional


@dataclass(frozen=True)
class Occurrence:
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    is_approximate: bool = False


def _parse_date(v) -> Optional[dt.date]:
    if not v:
        return None
    try:
        return dt.date.fromisoformat(str(v))
    except ValueError:
        return None


def _parse_time(v) -> Optional[dt.time]:
    if not v:
        return None
    try:
        h, m = str(v).split(":")[:2]
        return dt.time(int(h), int(m))
    except (ValueError, TypeError):
        return None


def weekday_dates(start: dt.date, end: dt.date, iso_day: int) -> list[dt.date]:
    """Все даты с днём недели iso_day (1 = пн) в [start, end]."""
    if start > end:
        return []
    d = start + dt.timedelta(days=(iso_day - start.isoweekday()) % 7)
    out = []
    while d <= end:
        out.append(d)
        d += dt.timedelta(days=7)
    return out


def expand_lesson(
    *,
    date_rule: dict,
    day_of_week: int,
    start_time: dt.time,
    end_time: dt.time,
    time_overrides: Optional[Iterable[dict]],
    period_start: Optional[dt.date],
    period_end: Optional[dt.date],
    force_approximate: bool = False,
) -> list[Occurrence]:
    rule = date_rule or {}
    rtype = rule.get("type")
    excluded = {d for d in map(_parse_date, rule.get("excluded_dates") or []) if d}
    listed = [d for d in map(_parse_date, rule.get("dates") or []) if d]
    start_d = _parse_date(rule.get("start_date"))
    end_d = _parse_date(rule.get("end_date"))

    dates: dict[dt.date, bool] = {}   # дата -> приблизительная ли

    def add_weekly(a: dt.date, b: dt.date, approx: bool) -> None:
        for d in weekday_dates(a, b, day_of_week):
            dates.setdefault(d, approx)

    def add_explicit(ds: Iterable[dt.date]) -> None:
        for d in ds:
            dates.setdefault(d, d.isoweekday() != day_of_week)

    approximate = force_approximate

    if not approximate:
        if rtype in ("single", "list"):
            if listed:
                add_explicit(listed)
            else:
                approximate = True
        elif rtype == "range":
            end_eff = end_d or period_end
            if start_d is None or end_eff is None:
                approximate = True
            else:
                add_weekly(start_d, end_eff, False)
                add_explicit(listed)
        elif rtype == "whole_period":
            if rule.get("raw") and not excluded:
                approximate = True          # даты в тексте были, но не разобрались
            elif period_start and period_end:
                add_weekly(period_start, period_end, False)
            else:
                approximate = True
        else:
            approximate = True

    if approximate:
        dates.clear()
        if period_start and period_end:
            add_weekly(period_start, period_end, True)

    overrides: dict[dt.date, tuple[dt.time, dt.time]] = {}
    for o in time_overrides or []:
        d, s, e = _parse_date(o.get("on_date")), _parse_time(o.get("start_time")), _parse_time(o.get("end_time"))
        if d and s and e:
            overrides[d] = (s, e)

    result = []
    for d in sorted(dates):
        if d in excluded:
            continue
        s, e = overrides.get(d, (start_time, end_time))
        result.append(Occurrence(d, s, e, dates[d]))
    return result
