"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Clock3,
  Inbox,
  Infinity as InfinityIcon,
  MessageSquare,
  Moon,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { OpenEventFormButton } from "@/components/events";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDeadlines,
  getEventsByDate,
  getMe,
  getRoutinesByDay,
  getScheduleForUser,
  getTasksByDate,
  updateDeadline,
  type DayOfWeek,
  type Deadline,
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
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [defaultDate] = useState(() => isoDate(new Date()));
  const date = params.get("date") ?? defaultDate;
  const isToday = date === defaultDate;
  const day = new Date(`${date}T00:00:00`);
  const dayOfWeek = JS_DAY_TO_KEY[day.getDay()];

  const [sheet, setSheet] = useState<Deadline | "new" | null>(null);

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

  const toggleDeadlineMutation = useMutation({
    mutationFn: (deadline: Deadline) =>
      updateDeadline(deadline.id, { completed: !deadline.completed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
  });

  const isDayLoading =
    me.isPending ||
    events.isPending ||
    tasks.isPending ||
    routines.isPending ||
    (groupId != null && schedule.isPending);

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
        : task.description || linkedDeadline?.description || "задача",
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
      subtitle: event.description || "задача",
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
      subtitle: "постоянное дело",
    });
  }

  timelineItems.sort((a, b) => a.start_time.localeCompare(b.start_time));

  const datedDeadlines = [...(deadlines.data ?? [])]
    .filter((item) => item.expire_date)
    .sort((a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!));
  const openDeadlines = (deadlines.data ?? []).filter(
    (item) => !item.expire_date,
  );

  return (
    <AppShell>
      {/* Мобильная верхняя строка навигации */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> Неделя
        </Link>
        <OpenEventFormButton eventDate={date} />
      </div>

      {/* Десктопная шапка страницы по макету (стр. 39–40) */}
      <div className="mt-2 flex items-start justify-between gap-4 md:mt-0">
        <div>
          <h1 className="text-h1">{dayTitle(day)}</h1>
          {isToday && (
            <p className="mt-0.5 text-caption text-text-secondary">Сегодня</p>
          )}
        </div>
        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/plans"
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface px-3.5 text-[14px] font-medium text-text-main transition-colors hover:bg-bg-page"
          >
            <ChevronLeft className="size-4" />
            Неделя
          </Link>
          <OpenEventFormButton eventDate={date} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Левая колонка: расписание дня */}
        <section className="space-y-3 md:rounded-2xl md:bg-card md:p-5 md:ring-1 md:ring-border">
          {me.data?.wake_up_time != null && (
            <p className="flex items-center gap-2 rounded-xl border-l-4 border-sleep-bar bg-sleep-bg px-3.5 py-2.5 text-[13px] font-semibold text-text-main">
              <Moon className="size-4 text-sleep-bar" />
              <span>Сон · до {me.data.wake_up_time}</span>
            </p>
          )}

          {isDayLoading ? (
            <div className="space-y-3 py-2" aria-busy="true">
              {[1, 2, 3].map((id) => (
                <div key={id} className="flex gap-3">
                  <div className="w-12 space-y-1.5 pt-1">
                    <Skeleton className="h-4 w-10 rounded-md" />
                    <Skeleton className="h-4 w-10 rounded-md" />
                  </div>
                  <div className="flex-1 rounded-r-xl border-l-4 border-border bg-card px-3.5 py-2.5 ring-1 ring-border">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <div className="mt-2 flex items-center gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : timelineItems.length === 0 ? (
            <div className="rounded-2xl bg-card p-6 text-center text-text-secondary ring-1 ring-border md:bg-bg-page/50 md:ring-0">
              На этот день задач нет
            </div>
          ) : (
            <div className="space-y-3">
              {timelineItems.map((item) => (
                <article key={item.key} className="flex gap-3">
                  <div className="w-12 shrink-0 text-[13px] text-text-secondary">
                    <div className="font-semibold text-text-main">
                      {item.start_time}
                    </div>
                    <div>{item.end_time}</div>
                  </div>
                  <div
                    className={
                      item.kind === "para"
                        ? "flex-1 rounded-r-xl border-l-4 border-para-bar bg-para-bg px-3.5 py-2.5"
                        : item.kind === "task"
                          ? "flex-1 rounded-r-xl border-l-4 border-task-bar bg-task-bg px-3.5 py-2.5"
                          : "flex-1 rounded-r-xl border-l-4 border-delo-bar bg-delo-bg px-3.5 py-2.5"
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-text-main">
                        {item.title}
                      </p>
                      {item.kind === "task" && item.comment && (
                        <Popover>
                          <PopoverTrigger
                            openOnHover
                            delay={150}
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
                            <p className="text-[12px] text-white/70">
                              Комментарий
                            </p>
                            <p className="text-[13px] leading-[18px]">
                              {item.comment}
                            </p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[13px] text-text-secondary">
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
                      {item.subtitle && (
                        <span>
                          {item.start_time}
                          {item.end_time ? `–${item.end_time}` : ""} ·{" "}
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {me.data?.go_to_sleep_time && (
            <p className="flex items-center gap-2 rounded-xl border-l-4 border-sleep-bar bg-sleep-bg px-3.5 py-2.5 text-[13px] font-semibold text-text-main">
              <Moon className="size-4 text-sleep-bar" />
              <span>Сон · с {me.data.go_to_sleep_time}</span>
            </p>
          )}
        </section>

        {/* Правая колонка на десктопе по макету (стр. 39–40): Дедлайны и Бессрочные задания */}
        <div className="hidden space-y-6 lg:block">
          <DayDeadlineCard
            icon={<Clock3 className="size-4" />}
            title="Дедлайны"
            hint="Красные, жёлтые, зелёные"
            loading={deadlines.isPending}
            items={datedDeadlines}
            onToggle={(item) => toggleDeadlineMutation.mutate(item)}
            onEdit={setSheet}
            emptyIcon={<Inbox className="size-5" />}
            emptyTitle="Нет заданий с дедлайнами"
            emptyText="Добавьте домашку или проект — дедлайны появятся здесь по срочности."
            onCreate={() => setSheet("new")}
          />

          <DayDeadlineCard
            icon={<InfinityIcon className="size-4" />}
            title="Бессрочные задания"
            loading={deadlines.isPending}
            items={openDeadlines}
            onToggle={(item) => toggleDeadlineMutation.mutate(item)}
            onEdit={setSheet}
            emptyIcon={<InfinityIcon className="size-5" />}
            emptyTitle="Пока пусто"
            emptyText="Здесь будут задания без даты — например, «разобрать конспекты»."
          />
        </div>
      </div>

      <AssignmentSheet
        key={sheet === "new" ? "new" : sheet?.id ?? "closed"}
        open={sheet != null}
        deadline={sheet === "new" || sheet == null ? undefined : sheet}
        onClose={() => setSheet(null)}
      />
    </AppShell>
  );
}

function DayDeadlineCard({
  icon,
  title,
  hint,
  loading,
  items,
  onToggle,
  onEdit,
  emptyIcon,
  emptyTitle,
  emptyText,
  onCreate,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  loading?: boolean;
  items: Deadline[];
  onToggle: (deadline: Deadline) => void;
  onEdit: (deadline: Deadline) => void;
  emptyIcon?: ReactNode;
  emptyTitle: string;
  emptyText: string;
  onCreate?: () => void;
}) {
  return (
    <section className="rounded-2xl bg-card ring-1 ring-border">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-h3">{title}</h2>
          {hint && <p className="text-caption text-text-secondary">{hint}</p>}
        </div>
      </div>

      <div className="px-5 py-2">
        {loading ? (
          <ul className="divide-y divide-border" aria-busy="true">
            {[1, 2].map((id) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="px-3 py-6 text-center">
            {emptyIcon && (
              <span className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
                {emptyIcon}
              </span>
            )}
            <p className="text-body-strong text-text-main">{emptyTitle}</p>
            <p className="mx-auto mt-1 max-w-xs text-caption text-text-secondary">
              {emptyText}
            </p>
            {onCreate && (
              <Button className="mt-3 h-10" onClick={onCreate}>
                <Plus /> Новое задание
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <DeadlineItem
                key={item.id}
                deadline={item}
                done={Boolean(item.completed)}
                onToggle={() => onToggle(item)}
                onEdit={() => onEdit(item)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function DayPage() {
  return (
    <Suspense>
      <DayContent />
    </Suspense>
  );
}
