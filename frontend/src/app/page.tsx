"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
  Inbox,
  Infinity as InfinityIcon,
  MessageSquare,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
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
  greetingForNow,
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

interface TodayTimelineItem {
  key: string;
  kind: "para" | "task" | "delo";
  start_time: string;
  end_time: string;
  title: string;
  subtitle?: string | null;
  comment?: string | null;
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Deadline | null | "new">(null);

  const [today] = useState(() => new Date());
  const todayIso = isoDate(today);
  const todayWeekday = JS_DAY_TO_KEY[today.getDay()];

  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({
    queryKey: ["events", todayIso],
    queryFn: () => getEventsByDate(todayIso),
  });
  const tasks = useQuery({
    queryKey: ["tasks", todayIso],
    queryFn: () => getTasksByDate(todayIso),
  });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({
    queryKey: ["routines", todayWeekday],
    queryFn: () => getRoutinesByDay(todayWeekday),
  });

  const groupId = me.data?.group_id ?? null;

  const schedule = useQuery({
    queryKey: ["schedule", groupId, todayIso, todayIso],
    queryFn: () =>
      getScheduleForUser(me.data, {
        date_from: todayIso,
        date_to: todayIso,
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

  const isTimelineLoading =
    me.isPending ||
    events.isPending ||
    tasks.isPending ||
    routines.isPending ||
    (groupId != null && schedule.isPending);

  const deadlinesById = new Map(
    (deadlines.data ?? []).map((item) => [item.id, item]),
  );

  const timelineItems: TodayTimelineItem[] = [];

  const todaySchedule = schedule.data?.days.find((d) => d.date === todayIso);
  for (const [idx, lesson] of (todaySchedule?.lessons ?? []).entries()) {
    if (!lesson.subject) continue;
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
      title: lesson.subject,
      subtitle: location || lesson.lesson_type || null,
    });
  }

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
        : task.description || linkedDeadline?.description || "Задача",
      comment: linkedDeadline?.comment ?? null,
    });
  }

  for (const event of events.data ?? []) {
    timelineItems.push({
      key: `event-${event.id}`,
      kind: "task",
      start_time: eventClock(event.start_time),
      end_time: event.end_time ? eventClock(event.end_time) : "",
      title: event.name,
      subtitle: event.description || "Задача",
      comment: null,
    });
  }

  for (const routine of routines.data ?? []) {
    timelineItems.push({
      key: `routine-${routine.id}`,
      kind: "delo",
      start_time: eventClock(routine.start_time),
      end_time: eventClock(routine.end_time),
      title: routine.title,
      subtitle: "Постоянное дело",
    });
  }

  timelineItems.sort((a, b) => a.start_time.localeCompare(b.start_time));

  const dated = (deadlines.data ?? []).filter((item) => item.expire_date);
  const open = (deadlines.data ?? []).filter((item) => !item.expire_date);

  return (
    <AppShell>
      {/* Шапка страницы */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h1">
            {greetingForNow()}
            {me.data?.name ? `, ${me.data.name}` : ""}
          </h1>
          <p className="mt-0.5 text-caption text-text-secondary">
            {dayTitle(today)}
          </p>
        </div>
        <Button
          className="h-11 w-full sm:w-auto"
          onClick={() => setSheet("new")}
        >
          <Plus /> Новое задание
        </Button>
      </div>

      {/* Двухколоночная сетка на десктопе по макету */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Левая колонка: Задачи на сегодня */}
        <section className="rounded-2xl bg-card ring-1 ring-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2.5 text-h3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                <CalendarDays className="size-4" />
              </span>
              <span>Задачи на сегодня</span>
            </h2>
            {isTimelineLoading ? (
              <Skeleton className="h-4 w-16 rounded-md" />
            ) : (
              <span className="text-caption text-text-secondary">
                {timelineItems.length} событий
              </span>
            )}
          </div>

          <div className="p-5">
            {isTimelineLoading ? (
              <ul className="space-y-3.5" aria-busy="true">
                {[1, 2, 3, 4].map((id) => (
                  <li key={id} className="flex gap-3">
                    <div className="w-12 space-y-1.5 pt-1">
                      <Skeleton className="h-4 w-10 rounded-md" />
                      <Skeleton className="h-4 w-10 rounded-md" />
                    </div>
                    <div className="min-w-0 flex-1 border-l-4 border-border px-3 py-2">
                      <Skeleton className="h-5 w-3/4 rounded-md" />
                      <div className="mt-2 flex items-center gap-2">
                        <Skeleton className="h-5 w-14 rounded-full" />
                        <Skeleton className="h-4 w-28 rounded-md" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : timelineItems.length === 0 ? (
              <Empty
                icon={<CalendarDays className="size-5" />}
                title="На сегодня ничего не запланировано"
                text="Добавьте задачу на день в «Моих планах» — она появится здесь."
                action={
                  <Link
                    href="/plans"
                    className="mt-4 inline-flex h-10 items-center rounded-[10px] border border-border-subtle bg-surface px-4 text-[14px] font-medium text-text-main transition-colors hover:bg-bg-page"
                  >
                    Открыть мои планы
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {timelineItems.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <div className="w-12 shrink-0 text-[13px] leading-5 text-text-secondary">
                      <div className="font-semibold text-text-main">
                        {item.start_time}
                      </div>
                      <div>{item.end_time}</div>
                    </div>
                    <div
                      className={
                        item.kind === "task"
                          ? "min-w-0 flex-1 rounded-r-xl border-l-4 border-task-bar bg-task-bg px-3.5 py-2.5"
                          : item.kind === "delo"
                            ? "min-w-0 flex-1 rounded-r-xl border-l-4 border-delo-bar bg-delo-bg px-3.5 py-2.5"
                            : "min-w-0 flex-1 rounded-r-xl border-l-4 border-para-bar bg-para-bg px-3.5 py-2.5"
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
                              <p className="text-[13px] leading-4.5">
                                {item.comment}
                              </p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[13px] text-text-secondary">
                        <Badge
                          variant={
                            item.kind === "task"
                              ? "task"
                              : item.kind === "delo"
                                ? "delo"
                                : "para"
                          }
                        >
                          {item.kind === "task"
                            ? "Задача"
                            : item.kind === "delo"
                              ? "Дело"
                              : "Пара"}
                        </Badge>
                        {item.subtitle && <span>{item.subtitle}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Правая колонка: Мои дедлайны и Бессрочные задания */}
        <div className="space-y-6">
          <DeadlineSection
            icon={<Clock3 className="size-4" />}
            title="Мои дедлайны"
            hint="Сверху — самые срочные"
            headerRight={
              <Link
                href="/assignments"
                className="text-label font-semibold text-brand-primary hover:underline"
              >
                Все задания
              </Link>
            }
            loading={deadlines.isPending}
            items={[...dated].sort(
              (a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!),
            )}
            onToggle={(item) => toggleDeadlineMutation.mutate(item)}
            onEdit={setSheet}
            emptyIcon={<Inbox className="size-5" />}
            emptyTitle="Нет заданий с дедлайнами"
            emptyText="Добавьте домашку или проект — дедлайны появятся здесь по срочности."
            onCreate={() => setSheet("new")}
          />

          <DeadlineSection
            icon={<InfinityIcon className="size-4" />}
            title="Бессрочные задания"
            loading={deadlines.isPending}
            items={open}
            onToggle={(item) => toggleDeadlineMutation.mutate(item)}
            onEdit={setSheet}
            emptyIcon={<InfinityIcon className="size-5" />}
            emptyTitle="Пока пусто"
            emptyText="Здесь будут задания без даты — например, «разобрать конспекты»."
          />
        </div>
      </div>

      <AssignmentSheet
        key={sheet === "new" ? "new" : sheet?.id}
        open={sheet != null}
        deadline={sheet === "new" || sheet == null ? undefined : sheet}
        onClose={() => setSheet(null)}
      />
    </AppShell>
  );
}

function DeadlineSection({
  icon,
  title,
  hint,
  headerRight,
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
  headerRight?: ReactNode;
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
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
            {icon}
          </span>
          <div>
            <h2 className="text-h3">{title}</h2>
            {hint && (
              <p className="text-caption text-text-secondary">{hint}</p>
            )}
          </div>
        </div>
        {headerRight}
      </div>

      <div className="px-5 py-2">
        {loading ? (
          <ul className="divide-y divide-border" aria-busy="true">
            {[1, 2, 3].map((id) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <Empty
            icon={emptyIcon}
            title={emptyTitle}
            text={emptyText}
            action={
              onCreate && (
                <Button className="mt-4 h-10" onClick={onCreate}>
                  <Plus /> Новое задание
                </Button>
              )
            }
          />
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

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-8 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
          {icon}
        </span>
      )}
      <p className="text-h3 text-text-main">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-caption text-text-secondary">
        {text}
      </p>
      {action}
    </div>
  );
}
