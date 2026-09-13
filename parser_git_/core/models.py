"""
Модели данных для распарсенного расписания.

Слой моделей намеренно не зависит ни от Excel, ни от БД: это чистые
структуры, которые описывают предметную область (Program -> Course ->
Stream -> Group -> Day -> Time -> Lesson), как того требует ТЗ (раздел 35).
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date
from enum import Enum
from typing import Optional


class DayOfWeek(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


# Сопоставление сокращений из файла с нормализованным значением.
RAW_DAY_MAP = {
    "пн": DayOfWeek.MONDAY,
    "вт": DayOfWeek.TUESDAY,
    "ср": DayOfWeek.WEDNESDAY,
    "чт": DayOfWeek.THURSDAY,
    "пт": DayOfWeek.FRIDAY,
    "сб": DayOfWeek.SATURDAY,
    "вс": DayOfWeek.SUNDAY,
}


class DateRuleType(str, Enum):
    WHOLE_PERIOD = "whole_period"   # особых дат нет -> действует весь период расписания
    RANGE = "range"                 # 07.09.-19.10.
    LIST = "list"                   # 07.09., 21.09., 05.10.
    SINGLE = "single"               # 28.09.


@dataclass
class DateRule:
    type: DateRuleType
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    dates: list[date] = field(default_factory=list)
    raw: Optional[str] = None
    # Даты, явно отменённые в источнике (напр. "07.09. - отмена занятия").
    # Хранятся отдельно и не удаляются автоматически из start/end или dates,
    # чтобы не терять информацию и не гадать, что имелось в виду для
    # диапазона (RANGE) — решение остаётся за потребителем данных.
    excluded_dates: list[date] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "type": self.type.value,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "dates": [d.isoformat() for d in self.dates],
            "excluded_dates": [d.isoformat() for d in self.excluded_dates],
            "raw": self.raw,
        }
        return d


@dataclass
class Building:
    code: str
    address: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Group:
    name: str          # напр. "26КНТ-1"
    program: str        # напр. "Компьютерные науки и технологии"
    faculty: str         # напр. "ИМиКН"
    course: int          # напр. 1
    stream_label: str    # заголовок блока в файле: "I ПОТОК" / "Специализация ..."

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class TimeOverride:
    """Точечное исключение: в конкретную дату пара идёт в другое время.

    Реальный файл содержит записи вида
    '06.10. в 09:30-10:10' внутри ячейки с основным занятием.
    Модель не теряет эту информацию, но и не пытается выдать её
    за отдельное самостоятельное занятие первого класса.
    """
    on_date: date
    start_time: str
    end_time: str

    def to_dict(self) -> dict:
        return {
            "on_date": self.on_date.isoformat(),
            "start_time": self.start_time,
            "end_time": self.end_time,
        }


@dataclass
class Lesson:
    group: str
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    subject: Optional[str]
    lesson_type: Optional[str]
    teacher: Optional[str]
    room: Optional[str]
    building: Optional[str]
    online: bool
    dates: DateRule
    stream_group: Optional[str] = None
    time_overrides: list[TimeOverride] = field(default_factory=list)
    raw_text: Optional[str] = None
    source_cell: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "group": self.group,
            "day_of_week": self.day_of_week.value,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "subject": self.subject,
            "lesson_type": self.lesson_type,
            "teacher": self.teacher,
            "room": self.room,
            "building": self.building,
            "online": self.online,
            "dates": self.dates.to_dict(),
            "stream_group": self.stream_group,
            "time_overrides": [t.to_dict() for t in self.time_overrides],
            "raw_text": self.raw_text,
            "source_cell": self.source_cell,
        }


@dataclass
class ScheduleNote:
    """Заметка вместо обычного занятия — напр. блок с отсылкой к другому
    расписанию ('Занятия проводятся по расписанию дисциплины Английский
    язык...') или к расписанию секций физкультуры.

    Такие ячейки сознательно НЕ превращаются в Lesson, чтобы не придумывать
    несуществующие subject/teacher/room — это первый класс "внешняя ссылка
    на другое расписание", который parser обязан не терять (ТЗ, раздел 19).
    """
    group: str
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    text: str
    source_cell: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "group": self.group,
            "day_of_week": self.day_of_week.value,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text,
            "source_cell": self.source_cell,
        }


@dataclass
class ScheduleMetadata:
    faculty: str
    program: str
    course: int
    module: int
    period_start: Optional[date]
    period_end: Optional[date]
    sheet_name: str

    def to_dict(self) -> dict:
        return {
            "faculty": self.faculty,
            "program": self.program,
            "course": self.course,
            "module": self.module,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "sheet_name": self.sheet_name,
        }


class WarningSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"       # проблема одной ячейки, импорт можно продолжать
    CRITICAL = "critical"  # структура файла сломана, импорт нужно остановить


@dataclass
class ParseWarning:
    severity: WarningSeverity
    message: str
    location: Optional[str] = None
    raw_value: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "severity": self.severity.value,
            "message": self.message,
            "location": self.location,
            "raw_value": self.raw_value,
        }


@dataclass
class ParsedSchedule:
    metadata: ScheduleMetadata
    buildings: dict[str, Building]
    groups: dict[str, Group]
    lessons: list[Lesson]
    notes: list[ScheduleNote]
    warnings: list[ParseWarning]

    def to_dict(self) -> dict:
        groups_out: dict[str, dict] = {}
        for lesson in self.lessons:
            g = groups_out.setdefault(lesson.group, {})
            g.setdefault(lesson.day_of_week.value, []).append(lesson.to_dict())
        for note in self.notes:
            g = groups_out.setdefault(note.group, {})
            g.setdefault(note.day_of_week.value, []).append(
                {"note": note.to_dict()}
            )
        return {
            "source": self.metadata.to_dict(),
            "buildings": {k: v.to_dict() for k, v in self.buildings.items()},
            "groups": groups_out,
            "warnings": [w.to_dict() for w in self.warnings],
        }
