"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
  Infinity as InfinityIcon,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { AssignmentSheet } from "@/components/planner/assignment-sheet";
import { DeadlineItem } from "@/components/planner/deadline-item";
import { Button } from "@/components/ui/button";
import { getDeadlines, getEvents, getMe, type Deadline, type Event } from "@/lib/api";
import { doneIds, isOnboarded, toggleDone } from "@/lib/extras";
import { dayTitle, eventClock, eventOnDay, greetingForNow } from "@/lib/urgency";

export default function HomePage() {
  const router = useRouter();
  const [sheet, setSheet] = useState<Deadline | null | "new">(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: getDeadlines });

  useEffect(() => {
    if (!isOnboarded()) router.replace("/onboarding");
    setDone(doneIds());
  }, [router]);

  const today = new Date();
  const todayEvents = (events.data ?? []).filter((event: Event) =>
    eventOnDay(event.event_date, today),
  );
  const dated = (deadlines.data ?? []).filter((item) => item.expire_date);
  const open = (deadlines.data ?? []).filter((item) => !item.expire_date);

  function flip(id: number) {
    toggleDone(id);
    setDone(doneIds());
  }

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

      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-[#E3E5EC]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-h3">
            <CalendarDays className="size-5 text-primary" /> Задачи на сегодня
          </h2>
          <span className="text-caption text-text-secondary">{todayEvents.length} событий</span>
        </div>
        {todayEvents.length === 0 ? (
          <Empty
            title="На сегодня ничего не запланировано"
            text="Добавьте задачу на день в «Моих планах» — она появится здесь."
            action={<Link href="/plans" className="mt-3 inline-flex h-10 items-center rounded-xl border px-4 text-sm">Открыть мои планы</Link>}
          />
        ) : (
          <ul className="space-y-3">
            {todayEvents.map((event) => (
              <li key={event.id} className="flex gap-3">
                <div className="w-12 text-[13px] leading-5 text-text-secondary">
                  <div>{eventClock(event.start_time)}</div>
                  <div>{eventClock(event.end_time)}</div>
                </div>
                <div className="min-w-0 flex-1 border-l-4 border-[#5B6EE1] bg-[#E4E9FF] px-3 py-2">
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-[13px] text-text-secondary">
                    Пара{event.description ? ` · ${event.description}` : ""}
                  </p>
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
        items={[...dated].sort((a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!))}
        done={done}
        onToggle={flip}
        onEdit={setSheet}
        emptyTitle="Нет заданий с дедлайнами"
        emptyText="Добавьте домашку или проект — дедлайны появятся здесь по срочности."
        onCreate={() => setSheet("new")}
      />
      <DeadlineSection
        icon={<InfinityIcon className="size-5 text-primary" />}
        title="Бессрочные задания"
        items={open}
        done={done}
        onToggle={flip}
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
  done,
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
  done: Set<number>;
  onToggle: (id: number) => void;
  onEdit: (deadline: Deadline) => void;
  emptyTitle: string;
  emptyText: string;
  onCreate?: () => void;
}) {
  return (
    <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-[#E3E5EC]">
      <h2 className="flex items-center gap-2 text-h3">{icon} {title}</h2>
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
        <ul className="mt-2 divide-y divide-[#E3E5EC]">
          {items.map((item) => (
            <DeadlineItem
              key={item.id}
              deadline={item}
              done={done.has(item.id)}
              onToggle={() => onToggle(item.id)}
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
