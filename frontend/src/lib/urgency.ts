export type TrafficLevel = "red" | "yellow" | "green" | "none";

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return null;
  return Math.ceil((due - Date.now()) / 86_400_000);
}

export function trafficLevel(iso: string | null | undefined): TrafficLevel {
  const days = daysUntil(iso);
  if (days === null) return "none";
  if (days <= 5) return "red";
  if (days <= 14) return "yellow";
  return "green";
}

export function trafficLabel(iso: string | null | undefined) {
  const days = daysUntil(iso);
  if (days === null) return "без срока";
  if (days < 0) return "просрочено";
  if (days === 0) return "сегодня";
  return `${days} дн.`;
}

export function formatDue(iso: string | null | undefined) {
  if (!iso) return "без срока";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "без срока";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function isSameDay(iso: string, day: Date) {
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

export function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export function eventOnDay(eventDate: string, day: Date) {
  if (eventDate.length <= 10) {
    const [year, month, date] = eventDate.split("-").map(Number);
    return (
      year === day.getFullYear() &&
      month === day.getMonth() + 1 &&
      date === day.getDate()
    );
  }
  return isSameDay(eventDate, day);
}

export function eventClock(value: string) {
  if (value.includes("T")) return formatTime(value);
  return value.slice(0, 5);
}

const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export function todayLabel() {
  return new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function pillDate(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function dayTitle(day: Date) {
  const label = day.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function startOfWeek(day: Date) {
  const copy = new Date(day);
  const shift = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - shift);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(day: Date, amount: number) {
  const copy = new Date(day);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function isoDate(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}
