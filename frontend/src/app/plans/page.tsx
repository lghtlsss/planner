"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getDeadlines,
  getEvents,
  getRoutines,
  type DayOfWeek,
} from "@/lib/api";
import {
  addDays,
  dayTitle,
  eventOnDay,
  formatWeekRange,
  isoDate,
  pillDate,
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

export default function PlansPage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [pairs, setPairs] = useState(true);
  const [tasks, setTasks] = useState(true);

  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({ queryKey: ["routines"], queryFn: getRoutines });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(week, index)),
    [week],
  );
  const end = addDays(week, 6);

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
          const dayKey = DAY_KEYS[index];
          const dayEvents = pairs
            ? (events.data ?? []).filter((event) =>
                eventOnDay(event.event_date, day),
              )
            : [];
          const dayTasks = tasks
            ? (deadlines.data ?? []).filter(
                (item) => item.expire_date && eventOnDay(item.expire_date, day),
              )
            : [];
          const dayRoutines = tasks
            ? (routines.data ?? []).filter((r) => r.days.includes(dayKey))
            : [];

          const isEmpty =
            dayEvents.length === 0 &&
            dayTasks.length === 0 &&
            dayRoutines.length === 0;

          return (
            <Link
              key={isoDate(day)}
              href={`/day?date=${isoDate(day)}`}
              className="flex gap-3 rounded-3xl bg-card p-3 ring-1 ring-border transition-colors hover:bg-bg-page/50"
            >
              <div className="w-8 text-center">
                <div className="text-[12px] text-text-secondary">
                  {WEEKDAYS[index]}
                </div>
                <div className="text-h3">{day.getDate()}</div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                {isEmpty && (
                  <p className="text-caption text-text-secondary">
                    Свободный день
                  </p>
                )}
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border-l-4 border-para-bar bg-para-bg px-2.5 py-1 text-[13px]"
                  >
                    <span className="text-text-secondary">
                      {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}{" "}
                    </span>
                    <span className="font-medium text-text-main">
                      {event.name}
                    </span>
                  </div>
                ))}
                {dayTasks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-l-4 border-task-bar bg-task-bg px-2.5 py-1 text-[13px]"
                  >
                    <span className="font-medium text-text-main">
                      {item.title}
                    </span>
                    <span className="flex items-center gap-1 text-text-secondary">
                      {item.comment && <MessageSquare className="size-3" />}
                      {pillDate(item.expire_date)}
                    </span>
                  </div>
                ))}
                {dayRoutines.map((routine) => (
                  <div
                    key={routine.id}
                    className="border-l-4 border-delo-bar bg-delo-bg px-2.5 py-1 text-[13px]"
                  >
                    <span className="text-text-secondary">
                      {routine.start_time.slice(0, 5)}–
                      {routine.end_time.slice(0, 5)}{" "}
                    </span>
                    <span className="font-medium text-text-main">
                      {routine.name}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-5">
        <Label className="cursor-pointer">
          <Checkbox
            checked={pairs}
            onCheckedChange={(checked) => setPairs(Boolean(checked))}
          />
          Отображать пары
        </Label>
        <Label className="cursor-pointer">
          <Checkbox
            checked={tasks}
            onCheckedChange={(checked) => setTasks(Boolean(checked))}
          />
          Отображать дела
        </Label>
      </div>

      <p className="mt-2 text-caption text-text-secondary">
        Нажмите на день, чтобы открыть его план. «Отображать дела» включает и
        задачи, и постоянные дела.
      </p>
      <p className="sr-only">{dayTitle(week)}</p>
    </AppShell>
  );
}
