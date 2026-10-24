import {
  addDays as dfAddDays,
  differenceInCalendarDays,
  format,
  isSameDay as dfIsSameDay,
  isValid,
  parseISO,
  startOfWeek as dfStartOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";

export type TrafficLevel = "red" | "yellow" | "green" | "none";

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parsed = parseISO(iso);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(iso);
  return isValid(fallback) ? fallback : null;
}

export function daysUntil(iso: string | null | undefined): number | null {
  const due = toDate(iso);
  if (!due) return null;
  return differenceInCalendarDays(due, new Date());
}

export function trafficLevel(iso: string | null | undefined): TrafficLevel {
  const days = daysUntil(iso);
  if (days === null) return "none";
  if (days <= 5) return "red";
  if (days <= 14) return "yellow";
  return "green";
}

export function trafficLabel(iso: string | null | undefined): string {
  const days = daysUntil(iso);
  if (days === null) return "без срока";
  if (days < 0) return "просрочено";
  if (days === 0) return "сегодня";
  return `${days} дн.`;
}

export function formatDue(iso: string | null | undefined): string {
  const date = toDate(iso);
  if (!date) return "без срока";
  return format(date, "d MMM", { locale: ru }).replace(".", "");
}

export function formatTime(iso: string): string {
  const date = toDate(iso);
  if (!date) return "";
  return format(date, "HH:mm", { locale: ru });
}

export function isSameDay(iso: string, day: Date): boolean {
  if (!iso) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
    return iso.trim() === format(day, "yyyy-MM-dd");
  }
  const date = toDate(iso);
  if (!date) return false;
  return dfIsSameDay(date, day);
}

export function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export function eventOnDay(eventDate: string, day: Date): boolean {
  if (!eventDate) return false;
  const datePrefix = eventDate.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePrefix) && eventDate.length === 10) {
    return datePrefix === format(day, "yyyy-MM-dd");
  }
  return isSameDay(eventDate, day);
}

export function eventClock(value: string): string {
  if (value.includes("T")) return formatTime(value);
  return value.slice(0, 5);
}

export function todayLabel(): string {
  return format(new Date(), "EEEE, d MMMM", { locale: ru });
}

export function pillDate(iso: string | null | undefined): string {
  const date = toDate(iso);
  if (!date) return "";
  return format(date, "d MMM", { locale: ru }).replace(".", "");
}

export function dayTitle(day: Date): string {
  const label = format(day, "EEEE, d MMMM", { locale: ru });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeekRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "d", { locale: ru })} – ${format(end, "d MMMM", { locale: ru })}`;
  }
  return `${format(start, "d MMMM", { locale: ru })} – ${format(end, "d MMMM", { locale: ru })}`;
}

export function startOfWeek(day: Date): Date {
  return dfStartOfWeek(day, { weekStartsOn: 1 });
}

export function addDays(day: Date, amount: number): Date {
  return dfAddDays(day, amount);
}

export function isoDate(day: Date): string {
  return format(day, "yyyy-MM-dd");
}
