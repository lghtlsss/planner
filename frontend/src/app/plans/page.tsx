"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
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

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Мои планы</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setWeek(startOfWeek(new Date()))}
        >
          Сегодня
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between">
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
        <p className="text-[15px] font-semibold text-text-main">
          {formatWeekRange(week, end)}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {days.map((day, index) => {
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

          // 2. Запланированные задачи из дедлайнов (/tasks — отображаются всегда)
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

          // 3. Разовые задачи на этот день (/events — отображаются всегда)
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

          // 4. Постоянные дела (/routines — управляются ТОЛЬКО чекбоксом «Отображать дела»)
          if (showRoutines) {
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

          return (
            <Link
              key={dayIso}
              href={`/day?date=${dayIso}`}
              className="flex gap-3 rounded-3xl bg-card p-3 ring-1 ring-border transition-colors hover:bg-bg-page/50"
            >
              <div className="w-8 text-center">
                <div className="text-[12px] text-text-secondary">
                  {WEEKDAYS[index]}
                </div>
                <div className="text-h3">{day.getDate()}</div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {isWeekLoading ? (
                  <div className="space-y-1.5 py-0.5" aria-busy="true">
                    <Skeleton className="h-6 w-full rounded-md" />
                    {index % 2 === 0 && (
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                    )}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-caption text-text-secondary">
                    Свободный день
                  </p>
                ) : (
                  slots.map((slot) => (
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
          );
        })}
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

        <div className="flex items-center gap-3 text-caption text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-full bg-para-bar" /> пара
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-full bg-task-bar" /> задача
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-full bg-delo-bar" /> дело
          </span>
        </div>
      </div>

      <p className="mt-2 text-caption text-text-secondary">
        Нажмите на день, чтобы открыть его план.
      </p>
      <p className="sr-only">{dayTitle(week)}</p>
    </AppShell>
  );
}
