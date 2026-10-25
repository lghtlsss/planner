"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
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
import {
  getDeadlines,
  getEvents,
  getMe,
  getRoutines,
  getScheduleForUser,
  updateDeadline,
  type DayOfWeek,
  type Deadline,
  type Event,
} from "@/lib/api";
import {
  dayTitle,
  eventClock,
  eventOnDay,
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Deadline | null | "new">(null);

  const [today] = useState(() => new Date());
  const todayIso = isoDate(today);
  const todayWeekday = JS_DAY_TO_KEY[today.getDay()];

  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });
  const routines = useQuery({ queryKey: ["routines"], queryFn: getRoutines });

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

  useEffect(() => {
    if (
      me.isSuccess &&
      me.data &&
      (me.data.is_profile_completed === false ||
        !me.data.name?.trim() ||
        me.data.group_id == null)
    ) {
      router.replace("/onboarding");
    }
  }, [me.isSuccess, me.data, router]);

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

  for (const event of (events.data ?? []).filter((e: Event) =>
    eventOnDay(e.event_date, today),
  )) {
    timelineItems.push({
      key: `event-${event.id}`,
      kind: "task",
      start_time: eventClock(event.start_time),
      end_time: eventClock(event.end_time),
      title: event.name,
      subtitle: event.expire_date
        ? `Дедлайн ${pillDate(event.expire_date)}`
        : event.description || null,
      comment: event.comment ?? null,
    });
  }

  for (const routine of (routines.data ?? []).filter((r) =>
    r.days.includes(todayWeekday),
  )) {
    timelineItems.push({
      key: `routine-${routine.id}`,
      kind: "delo",
      start_time: eventClock(routine.start_time),
      end_time: eventClock(routine.end_time),
      title: routine.name,
      subtitle: "Постоянное дело",
    });
  }

  timelineItems.sort((a, b) => a.start_time.localeCompare(b.start_time));

  const dated = (deadlines.data ?? []).filter((item) => item.expire_date);
  const open = (deadlines.data ?? []).filter((item) => !item.expire_date);

  return (
    <AppShell>
      <h1 className="text-h1">
        {greetingForNow()}
        {me.data?.name ? `, ${me.data.name}` : ""}
      </h1>
      <p className="text-caption text-text-secondary">{dayTitle(today)}</p>
      <Button className="mt-4 h-11" onClick={() => setSheet("new")}>
        <Plus /> Новое задание
      </Button>

      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-h3">
            <CalendarDays className="size-5 text-primary" /> Задачи на сегодня
          </h2>
          <span className="text-caption text-text-secondary">
            {timelineItems.length} событий
          </span>
        </div>
        {timelineItems.length === 0 ? (
          <Empty
            title="На сегодня ничего не запланировано"
            text="Добавьте задачу на день в «Моих планах» — она появится здесь."
            action={
              <Link
                href="/plans"
                className="mt-3 inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-text-main hover:bg-bg-page"
              >
                Открыть мои планы
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {timelineItems.map((item) => (
              <li key={item.key} className="flex gap-3">
                <div className="w-12 text-[13px] leading-5 text-text-secondary">
                  <div className="font-semibold text-text-main">
                    {item.start_time}
                  </div>
                  <div>{item.end_time}</div>
                </div>
                <div
                  className={
                    item.kind === "task"
                      ? "min-w-0 flex-1 border-l-4 border-task-bar bg-task-bg px-3 py-2"
                      : item.kind === "delo"
                        ? "min-w-0 flex-1 border-l-4 border-delo-bar bg-delo-bg px-3 py-2"
                        : "min-w-0 flex-1 border-l-4 border-para-bar bg-para-bg px-3 py-2"
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
                  <div className="mt-0.5 flex items-center gap-2 text-[13px] text-text-secondary">
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
      </section>

      <DeadlineSection
        icon={<Clock3 className="size-5 text-primary" />}
        title="Мои дедлайны"
        hint="Сверху — самые срочные"
        items={[...dated].sort(
          (a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!),
        )}
        onToggle={(item) => toggleDeadlineMutation.mutate(item)}
        onEdit={setSheet}
        emptyTitle="Нет заданий с дедлайнами"
        emptyText="Добавьте домашку или проект — дедлайны появятся здесь по срочности."
        onCreate={() => setSheet("new")}
      />
      <DeadlineSection
        icon={<InfinityIcon className="size-5 text-primary" />}
        title="Бессрочные задания"
        items={open}
        onToggle={(item) => toggleDeadlineMutation.mutate(item)}
        onEdit={setSheet}
        emptyTitle="Пока пусто"
        emptyText="Здесь будут задания без даты — например, «разобрать конспекты»."
      />
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
  items,
  onToggle,
  onEdit,
  emptyTitle,
  emptyText,
  onCreate,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  items: Deadline[];
  onToggle: (deadline: Deadline) => void;
  onEdit: (deadline: Deadline) => void;
  emptyTitle: string;
  emptyText: string;
  onCreate?: () => void;
}) {
  return (
    <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
      <h2 className="flex items-center gap-2 text-h3">
        {icon} {title}
      </h2>
      {hint && <p className="text-caption text-text-secondary">{hint}</p>}
      {items.length === 0 ? (
        <Empty
          title={emptyTitle}
          text={emptyText}
          action={
            onCreate && (
              <Button className="mt-3 h-11" onClick={onCreate}>
                <Plus /> Новое задание
              </Button>
            )
          }
        />
      ) : (
        <ul className="mt-2 divide-y divide-border">
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
    </section>
  );
}

function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-2 py-6 text-center">
      <p className="text-h3">{title}</p>
      <p className="mt-1 text-caption text-text-secondary">{text}</p>
      {action}
    </div>
  );
}
