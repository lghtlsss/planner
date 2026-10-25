"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDeadlines,
  getEvents,
  getMe,
  getRoutines,
  getScheduleForUser,
  getTasksFromTo,
  type DayOfWeek,
} from "@/lib/api";
import {
  addDays,
  dayTitle,
  eventOnDay,
  formatWeekRange,
  isoDate,
  startOfWeek,
} from "@/lib/urgency";
import { cn } from "cn";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const DAY_KEYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

interface WeekSlotItem {
  key: string;
  kind: "para" | "task" | "delo";
  start_time: string;
  end_time: string;
  title: string;
  hasComment?: boolean;
}

export default function PlansPage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [showPairs, setShowPairs] = useState(true);
  const [showRoutines, setShowRoutines] = useState(true);
  const [todayIso] = useState(() => isoDate(new Date()));

  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const end = addDays(week, 6);
  const dateFrom = isoDate(week);
  const dateTo = isoDate(end);

  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const tasks = useQuery({
    queryKey: ["tasks", dateFrom, dateTo],
    queryFn: () => getTasksFromTo(dateFrom, dateTo),
  });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({ queryKey: ["routines"], queryFn: getRoutines });

  const deadlinesById = new Map(
    (deadlines.data ?? []).map((item) => [item.id, item]),
  );

  const groupId = me.data?.group_id ?? null;

  const schedule = useQuery({
    queryKey: ["schedule", groupId, dateFrom, dateTo],
    queryFn: () =>
      getScheduleForUser(me.data, {
        date_from: dateFrom,
        date_to: dateTo,
      }),
    enabled: groupId != null,
  });

  const isWeekLoading =
    me.isPending ||
    events.isPending ||
    tasks.isPending ||
    (showRoutines && routines.isPending) ||
    (showPairs && groupId != null && schedule.isPending);

  const dayColumns = days.map((day, index) => {
    const dayIso = isoDate(day);
    const dayKey = DAY_KEYS[index];
    const slots: WeekSlotItem[] = [];

    // 1. Пары из расписания (управляются чекбоксом «Отображать пары»)
    if (showPairs) {
      const scheduleLessons = (
        schedule.data?.days.find((d) => d.date === dayIso)?.lessons ?? []
      ).filter((lesson) => Boolean(lesson.subject));

      for (const [lessonIdx, lesson] of scheduleLessons.entries()) {
        slots.push({
          key: `para-${lessonIdx}-${lesson.start_time}`,
          kind: "para",
          start_time: lesson.start_time.slice(0, 5),
          end_time: lesson.end_time.slice(0, 5),
          title: lesson.subject!,
        });
      }
    }

    // 2. Запланированные задачи из дедлайнов (/tasks — управляются чекбоксом «Отображать дела»)
    if (showRoutines) {
      const dayTasks = (tasks.data ?? []).filter((task) =>
        eventOnDay(task.task_date, day),
      );
      for (const task of dayTasks) {
        const linkedDeadline = deadlinesById.get(task.deadline_id);
        slots.push({
          key: `task-${task.id}`,
          kind: "task",
          start_time: task.start_time.slice(0, 5),
          end_time: task.potential_end_time.slice(0, 5),
          title: task.title,
          hasComment: Boolean(linkedDeadline?.comment),
        });
      }

      // 3. Разовые задачи на этот день (/events — управляются чекбоксом «Отображать дела»)
      const dayEvents = (events.data ?? []).filter((event) =>
        eventOnDay(event.event_date, day),
      );
      for (const event of dayEvents) {
        slots.push({
          key: `event-${event.id}`,
          kind: "task",
          start_time: event.start_time.slice(0, 5),
          end_time: event.end_time ? event.end_time.slice(0, 5) : "",
          title: event.name,
          hasComment: false,
        });
      }

      // 4. Постоянные дела (/routines — управляются чекбоксом «Отображать дела»)
      const dayRoutines = (routines.data ?? []).filter((r) =>
        r.days.includes(dayKey),
      );
      for (const routine of dayRoutines) {
        slots.push({
          key: `delo-${routine.id}`,
          kind: "delo",
          start_time: routine.start_time.slice(0, 5),
          end_time: routine.end_time.slice(0, 5),
          title: routine.title,
        });
      }
    }

    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    return {
      day,
      dayIso,
      weekdayShort: WEEKDAYS[index],
      isToday: dayIso === todayIso,
      slots,
    };
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Мои планы</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => setWeek(startOfWeek(new Date()))}
        >
          <CalendarDays className="size-4" />
          Сегодня
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between md:justify-start md:gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setWeek(addDays(week, -7))}
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setWeek(addDays(week, 7))}
            aria-label="Следующая неделя"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-[16px] font-semibold text-text-main md:text-h3">
          {formatWeekRange(week, end)}
        </p>
      </div>

      {/* Десктопная 7-колоночная сетка недели по макету (стр. 15–16) */}
      <div className="mt-4 hidden overflow-hidden rounded-2xl bg-card ring-1 ring-border md:grid md:min-h-[520px] md:grid-cols-7 md:divide-x md:divide-border">
        {dayColumns.map((col, index) => (
          <Link
            key={col.dayIso}
            href={`/day?date=${col.dayIso}`}
            className="group flex min-w-0 flex-col transition-colors hover:bg-bg-page/40"
          >
            <div className="flex items-baseline gap-1.5 border-b border-border px-3.5 py-3">
              <span
                className={cn(
                  "text-[13px] font-medium",
                  col.isToday ? "text-brand-primary" : "text-text-secondary",
                )}
              >
                {col.weekdayShort}
              </span>
              <span
                className={cn(
                  "text-[20px] leading-6 font-bold",
                  col.isToday ? "text-brand-primary" : "text-text-main",
                )}
              >
                {col.day.getDate()}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
              {isWeekLoading ? (
                <div className="space-y-2 py-1" aria-busy="true">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  {index % 2 === 0 && (
                    <Skeleton className="h-12 w-full rounded-lg" />
                  )}
                </div>
              ) : col.slots.length === 0 ? (
                <p className="px-1 py-1 text-caption text-text-secondary">
                  Свободный день
                </p>
              ) : (
                col.slots.map((slot) => (
                  <div
                    key={slot.key}
                    lang="ru"
                    className={cn(
                      "min-w-0 overflow-hidden rounded-r-lg border-l-4 px-2.5 py-2 text-[13px] leading-[17px]",
                      slot.kind === "para" &&
                        "border-para-bar bg-para-bg text-text-main",
                      slot.kind === "task" &&
                        "border-task-bar bg-task-bg text-text-main",
                      slot.kind === "delo" &&
                        "border-delo-bar bg-delo-bg text-text-main",
                    )}
                  >
                    <div className="text-[11px] leading-4 text-text-secondary">
                      {slot.start_time}
                      {slot.end_time ? `–${slot.end_time}` : ""}
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-start justify-between gap-1.5">
                      <span className="min-w-0 flex-1 font-semibold wrap-anywhere hyphens-auto text-text-main">
                        {slot.title}
                      </span>
                      {slot.kind === "task" && slot.hasComment && (
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-text-secondary" />
                      )}
                    </div>
                  </div>
                ))
              )}

              <div className="mt-auto pt-3 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-primary/50 bg-brand-primary-light/60 text-[12px] font-medium text-brand-primary">
                  <CalendarDays className="size-3.5" />
                  Открыть день
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Мобильный вертикальный список дней */}
      <div className="mt-4 space-y-3 md:hidden">
        {dayColumns.map((col, index) => (
          <Link
            key={col.dayIso}
            href={`/day?date=${col.dayIso}`}
            className="flex gap-3 rounded-3xl bg-card p-3 ring-1 ring-border transition-colors hover:bg-bg-page/50"
          >
            <div className="w-8 text-center">
              <div
                className={cn(
                  "text-[12px]",
                  col.isToday
                    ? "font-semibold text-brand-primary"
                    : "text-text-secondary",
                )}
              >
                {col.weekdayShort}
              </div>
              <div
                className={cn(
                  "text-h3",
                  col.isToday && "text-brand-primary",
                )}
              >
                {col.day.getDate()}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {isWeekLoading ? (
                <div className="space-y-1.5 py-0.5" aria-busy="true">
                  <Skeleton className="h-6 w-full rounded-md" />
                  {index % 2 === 0 && (
                    <Skeleton className="h-6 w-3/4 rounded-md" />
                  )}
                </div>
              ) : col.slots.length === 0 ? (
                <p className="text-caption text-text-secondary">
                  Свободный день
                </p>
              ) : (
                col.slots.map((slot) => (
                  <div
                    key={slot.key}
                    className={
                      slot.kind === "para"
                        ? "border-l-4 border-para-bar bg-para-bg px-2.5 py-1 text-[13px]"
                        : slot.kind === "task"
                          ? "flex items-center justify-between gap-2 border-l-4 border-task-bar bg-task-bg px-2.5 py-1 text-[13px]"
                          : "border-l-4 border-delo-bar bg-delo-bg px-2.5 py-1 text-[13px]"
                    }
                  >
                    <div className="min-w-0 truncate">
                      <span className="text-text-secondary">
                        {slot.start_time}
                        {slot.end_time ? `–${slot.end_time}` : ""}{" "}
                      </span>
                      <span className="font-medium text-text-main">
                        {slot.title}
                      </span>
                    </div>
                    {slot.kind === "task" && slot.hasComment && (
                      <MessageSquare className="size-3.5 shrink-0 text-text-secondary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5">
          <Label className="cursor-pointer">
            <Checkbox
              checked={showPairs}
              onCheckedChange={(checked) => setShowPairs(Boolean(checked))}
            />
            Отображать пары
          </Label>
          <Label className="cursor-pointer">
            <Checkbox
              checked={showRoutines}
              onCheckedChange={(checked) => setShowRoutines(Boolean(checked))}
            />
            Отображать дела
          </Label>
        </div>

        <div className="flex items-center gap-4 text-caption text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-1 rounded-full bg-para-bar" /> пара
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-1 rounded-full bg-task-bar" /> задача
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-1 rounded-full bg-delo-bar" /> дело
          </span>
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-caption text-text-secondary">
        <Info className="size-3.5 shrink-0 text-text-placeholder" />
        <span>
          Нажмите на день, чтобы открыть его план. «Отображать дела» включает и
          задачи, и постоянные дела.
        </span>
      </p>
      <p className="sr-only">{dayTitle(week)}</p>
    </AppShell>
  );
}
