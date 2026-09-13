"""
Validators — проверка корректности распарсенных данных.

Здесь два уровня:
- validate_schedule(...) — проверки на уровне одного расписания
  (типы данных, start<end, дубликаты и т. п.);
- sanity_check_against_previous(...) — грубая защита от "parser
  сломался и тихо съел половину расписания" при сравнении с
  предыдущей успешной версией.

Критическая ошибка (WarningSeverity.CRITICAL) должна останавливать
импорт — заменять текущее рабочее расписание нельзя.
"""

from __future__ import annotations

from datetime import datetime

from .models import ParsedSchedule, ParseWarning, WarningSeverity


class ScheduleValidationError(Exception):
    """Критическая ошибка валидации — импортировать/публиковать нельзя."""


def _parse_hhmm(value: str) -> tuple[int, int]:
    h, m = value.split(":")
    return int(h), int(m)


def validate_schedule(schedule: ParsedSchedule) -> list[ParseWarning]:
    warnings: list[ParseWarning] = list(schedule.warnings)

    if not schedule.groups and not {lesson.group for lesson in schedule.lessons}:
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.CRITICAL,
                message="В расписании не найдено ни одной группы.",
            )
        )

    if not schedule.lessons:
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.CRITICAL,
                message="В расписании не найдено ни одного занятия — результат подозрительно пуст.",
            )
        )

    seen_slots: dict[tuple, int] = {}

    for lesson in schedule.lessons:
        loc = lesson.source_cell

        try:
            sh, sm = _parse_hhmm(lesson.start_time)
            eh, em = _parse_hhmm(lesson.end_time)
            if (eh, em) <= (sh, sm):
                warnings.append(
                    ParseWarning(
                        severity=WarningSeverity.ERROR,
                        message=f"Некорректный интервал времени: {lesson.start_time}-{lesson.end_time} (начало не раньше конца).",
                        location=loc,
                        raw_value=lesson.raw_text,
                    )
                )
        except (ValueError, AttributeError):
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.ERROR,
                    message=f"Не удалось разобрать время: '{lesson.start_time}'-'{lesson.end_time}'.",
                    location=loc,
                    raw_value=lesson.raw_text,
                )
            )

        if lesson.subject is None:
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.ERROR,
                    message="Занятие без определённого названия дисциплины.",
                    location=loc,
                    raw_value=lesson.raw_text,
                )
            )

        if lesson.online and (lesson.room or lesson.building):
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.WARNING,
                    message="Занятие помечено как online, но также содержит аудиторию/корпус.",
                    location=loc,
                    raw_value=lesson.raw_text,
                )
            )

        if not lesson.online and not lesson.room:
            warnings.append(
                ParseWarning(
                    severity=WarningSeverity.INFO,
                    message="Отсутствует аудитория (и занятие не online).",
                    location=loc,
                    raw_value=lesson.raw_text,
                )
            )

        key = (lesson.group, lesson.day_of_week, lesson.start_time)
        seen_slots[key] = seen_slots.get(key, 0) + 1

    return warnings


def sanity_check_against_previous(
    schedule: ParsedSchedule,
    previous_group_count: int | None,
    previous_lesson_count: int | None,
    drop_ratio_threshold: float = 0.5,
) -> list[ParseWarning]:
    """Грубая защита от "тихой" деградации при обновлении источника
    (ТЗ, раздел 20 — пример с 26 группами/4300 занятиями -> 2/17)."""
    warnings: list[ParseWarning] = []
    current_groups = len({lesson.group for lesson in schedule.lessons})
    current_lessons = len(schedule.lessons)

    if previous_group_count and current_groups < previous_group_count * (1 - drop_ratio_threshold):
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.CRITICAL,
                message=(
                    f"Число групп резко упало: было {previous_group_count}, стало {current_groups}. "
                    "Похоже, parser сломался — публиковать это расписание нельзя."
                ),
            )
        )

    if previous_lesson_count and current_lessons < previous_lesson_count * (1 - drop_ratio_threshold):
        warnings.append(
            ParseWarning(
                severity=WarningSeverity.CRITICAL,
                message=(
                    f"Число занятий резко упало: было {previous_lesson_count}, стало {current_lessons}. "
                    "Похоже, parser сломался — публиковать это расписание нельзя."
                ),
            )
        )

    return warnings


def raise_if_critical(warnings: list[ParseWarning]) -> None:
    critical = [w for w in warnings if w.severity == WarningSeverity.CRITICAL]
    if critical:
        messages = "; ".join(w.message for w in critical)
        raise ScheduleValidationError(f"Критические ошибки валидации: {messages}")
