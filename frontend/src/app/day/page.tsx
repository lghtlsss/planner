"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MessageSquare, Moon } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { OpenEventFormButton } from "@/components/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getDeadlines,
  getEventsByDate,
  getMe,
  getRoutinesByDay,
  getScheduleForUser,
  getTasksByDate,
  type DayOfWeek,
} from "@/lib/api";
import {
  dayTitle,
  eventClock,
  isoDate,
  pillDate,
} from "@/lib/urgency";

const JS_DAY_TO_KEY: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

interface DayTimelineItem {
  key: string;
  kind: "para" | "task" | "delo";
  start_time: string;
  end_time: string;
  title: string;
  subtitle?: string | null;
  comment?: string | null;
}

function DayContent() {
  const params = useSearchParams();
  const [defaultDate] = useState(() => isoDate(new Date()));
  const date = params.get("date") ?? defaultDate;
  const day = new Date(`${date}T00:00:00`);
  const dayOfWeek = JS_DAY_TO_KEY[day.getDay()];

  const events = useQuery({
    queryKey: ["events", date],
    queryFn: () => getEventsByDate(date),
  });
  const tasks = useQuery({
    queryKey: ["tasks", date],
    queryFn: () => getTasksByDate(date),
  });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({
    queryKey: ["routines", dayOfWeek],
    queryFn: () => getRoutinesByDay(dayOfWeek),
  });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });

  const groupId = me.data?.group_id ?? null;

  const schedule = useQuery({
    queryKey: ["schedule", groupId, date, date],
    queryFn: () =>
      getScheduleForUser(me.data, {
        date_from: date,
        date_to: date,
      }),
    enabled: groupId != null,
  });

  const deadlinesById = new Map(
    (deadlines.data ?? []).map((item) => [item.id, item]),
  );

  const timelineItems: DayTimelineItem[] = [];

  // 1. Пары из расписания группы (/schedule)
  const dayObj = schedule.data?.days.find((d) => d.date === date);
  const dayLessons = (dayObj?.lessons ?? []).filter((lesson) =>
    Boolean(lesson.subject),
  );
  for (const [idx, lesson] of dayLessons.entries()) {
    const location = [
      lesson.building ? `к. ${lesson.building}` : null,
      lesson.room ? `ауд. ${lesson.room}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    timelineItems.push({
      key: `para-${idx}-${lesson.start_time}`,
      kind: "para",
      start_time: eventClock(lesson.start_time),
      end_time: eventClock(lesson.end_time),
      title: lesson.subject!,
      subtitle: location || lesson.lesson_type || null,
    });
  }

  // 2. Запланированные на этот день задачи из дедлайнов (/tasks)
  for (const task of tasks.data ?? []) {
    const linkedDeadline = deadlinesById.get(task.deadline_id);
    timelineItems.push({
      key: `task-${task.id}`,
      kind: "task",
      start_time: eventClock(task.start_time),
      end_time: eventClock(task.potential_end_time),
      title: task.title,
      subtitle: linkedDeadline?.expire_date
        ? `Дедлайн ${pillDate(linkedDeadline.expire_date)}`
        : task.description || linkedDeadline?.description || null,
      comment: linkedDeadline?.comment ?? null,
    });
  }

  // 3. Разовые задачи на этот день (/events)
  for (const event of events.data ?? []) {
    timelineItems.push({
      key: `event-${event.id}`,
      kind: "task",
      start_time: eventClock(event.start_time),
      end_time: event.end_time ? eventClock(event.end_time) : "",
      title: event.name,
      subtitle: event.description || null,
      comment: null,
    });
  }

  // 4. Постоянные дела на этот день недели (/routines)
  for (const routine of routines.data ?? []) {
    timelineItems.push({
      key: `delo-${routine.id}`,
      kind: "delo",
      start_time: eventClock(routine.start_time),
      end_time: eventClock(routine.end_time),
      title: routine.title,
      subtitle: "Постоянное дело",
    });
  }

  timelineItems.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> Неделя
        </Link>
        <OpenEventFormButton eventDate={date} />
      </div>

      <h1 className="mt-2 text-h1">{dayTitle(day)}</h1>

      <div className="mt-4 space-y-3">
        {me.data?.wake_up_time != null && (
          <p className="flex items-center gap-2 rounded-2xl border-l-4 border-sleep-bar bg-sleep-bg px-3 py-2 text-[13px] font-medium text-text-secondary">
            <Moon className="size-4 text-sleep-bar" />
            Сон · до {me.data.wake_up_time}
          </p>
        )}

        {timelineItems.length === 0 && (
          <p className="rounded-3xl bg-card p-4 text-text-secondary ring-1 ring-border">
            На этот день задач нет
          </p>
        )}

        {timelineItems.map((item) => (
          <article key={item.key} className="flex gap-3">
            <div className="w-12 text-[13px] text-text-secondary">
              <div className="font-semibold text-text-main">
                {item.start_time}
              </div>
              <div>{item.end_time}</div>
            </div>
            <div
              className={
                item.kind === "para"
                  ? "flex-1 border-l-4 border-para-bar bg-para-bg px-3 py-2"
                  : item.kind === "task"
                    ? "flex-1 border-l-4 border-task-bar bg-task-bg px-3 py-2"
                    : "flex-1 border-l-4 border-delo-bar bg-delo-bg px-3 py-2"
              }
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-text-main">{item.title}</p>
                {item.kind === "task" && item.comment && (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          aria-label="Комментарий"
                        />
                      }
                    >
                      <MessageSquare className="size-4" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-64 rounded-xl bg-text-main p-3 text-white shadow-lg"
                    >
                      <p className="text-[12px] text-white/70">Комментарий</p>
                      <p className="text-[13px] leading-[18px]">
                        {item.comment}
                      </p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[13px] text-text-secondary">
                <Badge
                  variant={
                    item.kind === "para"
                      ? "para"
                      : item.kind === "task"
                        ? "task"
                        : "delo"
                  }
                >
                  {item.kind === "para"
                    ? "Пара"
                    : item.kind === "task"
                      ? "Задача"
                      : "Дело"}
                </Badge>
                {item.subtitle && <span>{item.subtitle}</span>}
              </div>
            </div>
          </article>
        ))}

        {me.data?.go_to_sleep_time && (
          <p className="flex items-center gap-2 rounded-2xl border-l-4 border-sleep-bar bg-sleep-bg px-3 py-2 text-[13px] font-medium text-text-secondary">
            <Moon className="size-4 text-sleep-bar" />
            Сон · с {me.data.go_to_sleep_time}
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
