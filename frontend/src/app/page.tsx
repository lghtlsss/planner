"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
  Infinity as InfinityIcon,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDeadlines,
  getEvents,
  getMe,
  updateDeadline,
  type Deadline,
  type Event,
} from "@/lib/api";
import { dayTitle, eventClock, eventOnDay, greetingForNow, pillDate } from "@/lib/urgency";

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sheet, setSheet] = useState<Deadline | null | "new">(null);

  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: getDeadlines });

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
      me.data.is_profile_completed === false &&
      !me.data.name?.trim()
    ) {
      router.replace("/onboarding");
    }
  }, [me.isSuccess, me.data, router]);

  const today = new Date();
  const todayEvents = (events.data ?? []).filter((event: Event) =>
    eventOnDay(event.event_date, today),
  );
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
            {todayEvents.length} событий
          </span>
        </div>
        {todayEvents.length === 0 ? (
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
            {todayEvents.map((event) => {
              const isTask = event.deadline_id != null;
              return (
                <li key={event.id} className="flex gap-3">
                  <div className="w-12 text-[13px] leading-5 text-text-secondary">
                    <div>{eventClock(event.start_time)}</div>
                    <div>{eventClock(event.end_time)}</div>
                  </div>
                  <div
                    className={
                      isTask
                        ? "min-w-0 flex-1 border-l-4 border-task-bar bg-task-bg px-3 py-2"
                        : "min-w-0 flex-1 border-l-4 border-para-bar bg-para-bg px-3 py-2"
                    }
                  >
                    <p className="font-semibold text-text-main">{event.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[13px] text-text-secondary">
                      <Badge variant={isTask ? "task" : "para"}>
                        {isTask ? "Задача" : "Пара"}
                      </Badge>
                      {event.expire_date ? (
                        <span>Дедлайн {pillDate(event.expire_date)}</span>
                      ) : (
                        event.description && <span>{event.description}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
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
