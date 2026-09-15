"""
Источник расписания.

Согласно ТЗ (раздел 3), parser не должен быть жёстко привязан к тому,
откуда физически взялся файл. Этот модуль — единственное место, которое
знает про HTTP/Google/Яндекс.Диск; наружу (в core/parser.py) всегда
отдаются просто байты валидного xlsx на диске плюс их sha256. Ни
parser.py, ни normalizer.py не меняются вне зависимости от того, что
добавится сюда в будущем (авторизованный доступ, кэширование и т. п.).

Поддерживаемые виды ввода (см. ANALYSIS.md, раздел "Источники"):
- локальный путь к xlsx-файлу;
- ссылка на Google Таблицу (любой из типовых форматов —
  .../edit?gid=..., .../edit?usp=drive_link, просто /d/{id}/...);
- публичная ссылка на Яндекс.Диск (disk.yandex.*, yadi.sk);
- произвольная прямая ссылка на скачивание xlsx.

Ни один из сетевых источников не требует авторизации — они рассчитаны
на файлы, доступные "по ссылке". Приватные ресурсы будут явно и понятно
отклонены (см. _ensure_looks_like_xlsx), а не тихо превращены в мусор
на входе parser'а.
"""

from __future__ import annotations

import hashlib
import re
import shutil
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

import requests

USER_AGENT = (
    "Mozilla/5.0 (compatible; HSEScheduleParser/1.0; "
    "+https://github.com/) schedule-parser-bot"
)
HTTP_TIMEOUT = 30


class ScheduleSourceError(Exception):
    """Базовая ошибка получения расписания из источника."""


class SourceAccessError(ScheduleSourceError):
    """Источник недоступен, требует авторизации, или отдал не тот
    контент, который ожидался (не файл xlsx)."""


class UnsupportedSourceError(ScheduleSourceError):
    """Строка, переданная пользователем, не опознана ни как локальный
    путь, ни как один из поддерживаемых видов ссылок."""


@dataclass
class RawFile:
    path: Path
    content_hash: str
    origin: str
    _cleanup: Optional[Callable[[], None]] = field(default=None, repr=False)

    def cleanup(self) -> None:
        """Удаляет временные файлы, если источник их создавал
        (сетевые источники). Для LocalFileSource — no-op: исходный
        файл пользователя мы никогда не трогаем."""
        if self._cleanup is not None:
            self._cleanup()


class ScheduleSource:
    """Базовый интерфейс источника."""

    def fetch(self) -> RawFile:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Локальный файл
# ---------------------------------------------------------------------------


class LocalFileSource(ScheduleSource):
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def fetch(self) -> RawFile:
        if not self.path.exists():
            raise FileNotFoundError(f"Файл не найден: {self.path}")
        content = self.path.read_bytes()
        content_hash = hashlib.sha256(content).hexdigest()
        return RawFile(path=self.path, content_hash=content_hash, origin=str(self.path))


# ---------------------------------------------------------------------------
# Общие вспомогательные функции для сетевых источников
# ---------------------------------------------------------------------------

XLSX_MAGIC = b"PK"  # xlsx — это zip-архив


def _ensure_looks_like_xlsx(content: bytes, content_type: Optional[str], origin: str) -> None:
    if content_type and "text/html" in content_type.lower():
        raise SourceAccessError(
            f"По ссылке '{origin}' вернулась html-страница вместо файла — "
            "похоже, ресурс приватный и требует авторизации, либо ссылка "
            "ведёт не на файл, а на веб-страницу. Нужна ссылка с доступом "
            "'по ссылке может просматривать любой' (или прямая ссылка на "
            "скачивание xlsx)."
        )
    if not content.startswith(XLSX_MAGIC):
        preview = content[:80]
        raise SourceAccessError(
            f"Содержимое по ссылке '{origin}' не похоже на xlsx-файл "
            f"(Content-Type={content_type!r}, начало содержимого: {preview!r}). "
            "Возможно, по этой ссылке лежит не расписание, а другой документ."
        )


def _save_to_tempfile(content: bytes, suffix: str = ".xlsx") -> tuple[Path, Callable[[], None]]:
    tmp_dir = Path(tempfile.mkdtemp(prefix="schedule_source_"))
    tmp_path = tmp_dir / f"downloaded{suffix}"
    tmp_path.write_bytes(content)
    return tmp_path, lambda: shutil.rmtree(tmp_dir, ignore_errors=True)


def _http_get(url: str, **kwargs) -> requests.Response:
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=HTTP_TIMEOUT, **kwargs)
    except requests.RequestException as exc:
        raise SourceAccessError(f"Не удалось скачать '{url}': {exc}") from exc
    if resp.status_code != 200:
        raise SourceAccessError(
            f"Сервер вернул статус {resp.status_code} для '{url}' — "
            "проверьте, что ссылка верна и файл доступен."
        )
    return resp


# ---------------------------------------------------------------------------
# Google Таблицы
# ---------------------------------------------------------------------------

GOOGLE_SHEETS_RE = re.compile(r"docs\.google\.com/spreadsheets/d/([a-zA-Z0-9_-]+)")


class GoogleSheetsSource(ScheduleSource):
    """Скачивает ВЕСЬ файл (все листы) через публичный export-эндпоинт
    Google — без API-ключа и без OAuth, при условии, что таблица
    доступна по ссылке ("Просмотр" для любого, у кого есть ссылка).

    Специально не используется export?format=csv&gid=... — CSV не хранит
    merged cells, а на них держится вся структура parser'а (день на 8
    строк, потоки, блоки-заглушки на несколько групп сразу). Полный
    xlsx-экспорт сохраняет merge один в один, поэтому gid конкретной
    вкладки нам не нужен вообще: скачиваем книгу целиком.
    """

    def __init__(self, spreadsheet_id: str, source_url: Optional[str] = None):
        self.spreadsheet_id = spreadsheet_id
        self.source_url = source_url or f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"

    @classmethod
    def from_url(cls, url: str) -> "GoogleSheetsSource":
        m = GOOGLE_SHEETS_RE.search(url)
        if not m:
            raise UnsupportedSourceError(f"Не похоже на ссылку Google Таблиц: '{url}'")
        return cls(spreadsheet_id=m.group(1), source_url=url)

    @property
    def export_url(self) -> str:
        return f"https://docs.google.com/spreadsheets/d/{self.spreadsheet_id}/export?format=xlsx"

    def fetch(self) -> RawFile:
        resp = _http_get(self.export_url)
        content_type = resp.headers.get("Content-Type")
        _ensure_looks_like_xlsx(resp.content, content_type, self.source_url)
        content_hash = hashlib.sha256(resp.content).hexdigest()
        tmp_path, cleanup = _save_to_tempfile(resp.content)
        return RawFile(path=tmp_path, content_hash=content_hash, origin=self.source_url, _cleanup=cleanup)


# ---------------------------------------------------------------------------
# Яндекс.Диск (публичные ссылки)
# ---------------------------------------------------------------------------

YANDEX_DISK_RE = re.compile(r"(disk\.yandex\.|disk\.360\.yandex\.|yadi\.sk)", re.IGNORECASE)

YANDEX_API_RESOURCES = "https://cloud-api.yandex.net/v1/disk/public/resources"
YANDEX_API_DOWNLOAD = "https://cloud-api.yandex.net/v1/disk/public/resources/download"


class YandexDiskSource(ScheduleSource):
    """Публичная ссылка на Яндекс.Диск — используется официальный
    публичный REST API Яндекс.Диска (авторизация не нужна для
    публичных ресурсов).

    Если по ссылке лежит не файл-расписание, а что-то другое (папка,
    страница-заглушка, документ другого формата) — это не обрабатывается
    специальным образом: запрос честно попробует скачать то, что там
    есть, а дальше сработает либо проверка "это не xlsx" здесь, либо
    структурная проверка в core/parser.py ("не найдена ячейка 'День'").
    В обоих случаях пользователь получит понятную причину отказа, а не
    тихо собранное пустое расписание.
    """

    def __init__(self, public_url: str):
        self.public_url = public_url

    def fetch(self) -> RawFile:
        meta_resp = _http_get(YANDEX_API_RESOURCES, params={"public_key": self.public_url})
        meta = meta_resp.json()

        resource_type = meta.get("type")
        if resource_type == "dir":
            raise SourceAccessError(
                f"Ссылка '{self.public_url}' ведёт на папку на Яндекс.Диске, а не на файл. "
                "Нужна ссылка на конкретный xlsx-файл внутри неё."
            )

        dl_resp = _http_get(YANDEX_API_DOWNLOAD, params={"public_key": self.public_url})
        href = dl_resp.json().get("href")
        if not href:
            raise SourceAccessError(
                f"Яндекс.Диск не отдал ссылку на скачивание для '{self.public_url}' "
                "— возможно, ресурс приватный или удалён."
            )

        file_resp = _http_get(href)
        content_type = file_resp.headers.get("Content-Type") or meta.get("mime_type")
        _ensure_looks_like_xlsx(file_resp.content, content_type, self.public_url)

        content_hash = hashlib.sha256(file_resp.content).hexdigest()
        tmp_path, cleanup = _save_to_tempfile(file_resp.content)
        return RawFile(path=tmp_path, content_hash=content_hash, origin=self.public_url, _cleanup=cleanup)


# ---------------------------------------------------------------------------
# Произвольная прямая ссылка (fallback)
# ---------------------------------------------------------------------------


class HttpFileSource(ScheduleSource):
    """Любая другая прямая ссылка на xlsx-файл (напр. постоянная
    ссылка на скачивание с какого-то другого хранилища)."""

    def __init__(self, url: str):
        self.url = url

    def fetch(self) -> RawFile:
        resp = _http_get(self.url)
        content_type = resp.headers.get("Content-Type")
        _ensure_looks_like_xlsx(resp.content, content_type, self.url)
        content_hash = hashlib.sha256(resp.content).hexdigest()
        tmp_path, cleanup = _save_to_tempfile(resp.content)
        return RawFile(path=tmp_path, content_hash=content_hash, origin=self.url, _cleanup=cleanup)


# ---------------------------------------------------------------------------
# Диспетчер: строка от пользователя -> подходящий Source
# ---------------------------------------------------------------------------


def resolve_source(user_input: str) -> ScheduleSource:
    """Определяет тип источника по строке (путь или ссылка любого из
    поддерживаемых видов) и возвращает готовый к fetch() объект."""
    value = user_input.strip()

    if value.startswith("http://") or value.startswith("https://"):
        if GOOGLE_SHEETS_RE.search(value):
            return GoogleSheetsSource.from_url(value)
        if YANDEX_DISK_RE.search(value):
            return YandexDiskSource(value)
        return HttpFileSource(value)

    local_path = Path(value)
    if local_path.exists():
        return LocalFileSource(local_path)

    raise UnsupportedSourceError(
        f"Не удалось определить тип источника для '{user_input}': "
        "это не существующий локальный путь и не похоже ни на ссылку "
        "Google Таблиц, ни на ссылку Яндекс.Диска, ни на прямую ссылку "
        "(http/https)."
    )
