"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Moon } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { OpenEventFormButton } from "@/components/events";
import { Badge } from "@/components/ui/badge";
import {
  getDeadlines,
  getEvents,
  getMe,
  getRoutines,
  type DayOfWeek,
} from "@/lib/api";
import { dayTitle, eventClock, eventOnDay, isoDate } from "@/lib/urgency";

const JS_DAY_TO_KEY: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function DayContent() {
  const params = useSearchParams();
  const date = params.get("date") ?? isoDate(new Date());
  const day = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const dayOfWeek = JS_DAY_TO_KEY[day.getDay()];

  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({ queryKey: ["routines"], queryFn: getRoutines });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });

  const dayEvents = (events.data ?? []).filter((event) =>
    eventOnDay(event.event_date, day),
  );
  const tasks = (deadlines.data ?? []).filter(
    (item) => item.expire_date && eventOnDay(item.expire_date, day),
  );
  const dayRoutines = (routines.data ?? []).filter((r) =>
    r.days.includes(dayOfWeek),
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> Неделя
        </Link>
        <OpenEventFormButton />
      </div>

      <h1 className="mt-2 text-h1">{dayTitle(day)}</h1>

      <div className="mt-4 space-y-3">
        {me.data?.wakeUpTime && (
          <p className="flex items-center gap-2 rounded-2xl border-l-4 border-sleep-bar bg-sleep-bg px-3 py-2 text-[13px] font-medium text-text-secondary">
            <Moon className="size-4 text-sleep-bar" />
            Сон · до {me.data.wakeUpTime}
          </p>
        )}

        {dayEvents.length === 0 &&
          tasks.length === 0 &&
          dayRoutines.length === 0 && (
            <p className="rounded-3xl bg-card p-4 text-text-secondary ring-1 ring-border">
              На этот день задач нет
            </p>
          )}

        {dayEvents.map((event) => {
          const isTask = event.deadline_id != null;
          return (
            <article key={event.id} className="flex gap-3">
              <div className="w-12 text-[13px] text-text-secondary">
                <div>{eventClock(event.start_time)}</div>
                <div>{eventClock(event.end_time)}</div>
              </div>
              <div
                className={
                  isTask
                    ? "flex-1 border-l-4 border-task-bar bg-task-bg px-3 py-2"
                    : "flex-1 border-l-4 border-para-bar bg-para-bg px-3 py-2"
                }
              >
                <p className="font-semibold text-text-main">{event.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[13px] text-text-secondary">
                  <Badge variant={isTask ? "task" : "para"}>
                    {isTask ? "Задача" : "Пара"}
                  </Badge>
                  {event.description && <span>{event.description}</span>}
                </div>
              </div>
            </article>
          );
        })}

        {dayRoutines.map((routine) => (
          <article key={routine.id} className="flex gap-3">
            <div className="w-12 text-[13px] text-text-secondary">
              <div>{routine.start_time.slice(0, 5)}</div>
              <div>{routine.end_time.slice(0, 5)}</div>
            </div>
            <div className="flex-1 border-l-4 border-delo-bar bg-delo-bg px-3 py-2">
              <p className="font-semibold text-text-main">{routine.name}</p>
              <p className="text-[13px] text-text-secondary">Постоянное дело</p>
            </div>
          </article>
        ))}

        {tasks.map((item) => (
          <article key={item.id} className="flex gap-3">
            <div className="w-12 text-[13px] text-text-secondary">день</div>
            <div className="flex-1 border-l-4 border-task-bar bg-task-bg px-3 py-2">
              <p className="font-semibold text-text-main">{item.title}</p>
              <p className="text-[13px] text-text-secondary">Дедлайн</p>
            </div>
          </article>
        ))}

        {me.data?.goToSleepTime && (
          <p className="flex items-center gap-2 rounded-2xl border-l-4 border-sleep-bar bg-sleep-bg px-3 py-2 text-[13px] font-medium text-text-secondary">
            <Moon className="size-4 text-sleep-bar" />
            Сон · с {me.data.goToSleepTime}
          </p>
        )}
      </div>
    </AppShell>
  );
}

export default function DayPage() {
  return (
    <Suspense>
      <DayContent />
    </Suspense>
  );
}
