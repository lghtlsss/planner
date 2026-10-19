"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OpenDeadlineFormButton } from "@/components/deadlines/open-deadline-form-button";
import { DeadlineRow } from "@/components/deadlines/deadline-row";
import { OpenEventFormButton } from "@/components/events";
import { AppShell } from "@/components/mobile/app-shell";
import { getDeadlines, getEvents, getMe, type Event } from "@/lib/api";
import {
  eventClock,
  eventOnDay,
  greetingForNow,
  todayLabel,
} from "@/lib/urgency";

export default function HomePage() {
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });

  const today = new Date();
  const todayEvents = (events.data ?? []).filter((event: Event) =>
    eventOnDay(event.event_date, today),
  );
  const nearest = [...(deadlines.data ?? [])]
    .sort((a, b) => {
      const left = a.expire_date ? new Date(a.expire_date).getTime() : Infinity;
      const right = b.expire_date ? new Date(b.expire_date).getTime() : Infinity;
      return left - right;
    })
    .slice(0, 5);

  const name = me.data?.name;

  return (
    <AppShell title="Главная">
      <div className="mb-4 flex gap-2">
        <OpenEventFormButton />
        <OpenDeadlineFormButton />
      </div>
      <section className="mb-5">
        <p className="text-sm text-muted-foreground">{todayLabel()}</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {greetingForNow()}
          {name ? `, ${name}` : ""}
        </h2>
        {me.data && !me.data.name && (
          <p className="mt-2 text-sm">
            Заполните имя в{" "}
            <Link href="/profile" className="text-primary underline">
              профиле
            </Link>
          </p>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Мой план на сегодня</h3>
          <Link href="/plans" className="text-sm text-primary">
            Все
          </Link>
        </div>
        {events.isPending && (
          <p className="text-sm text-muted-foreground">Загрузка плана…</p>
        )}
        {events.isError && (
          <p className="text-sm text-destructive">Не удалось загрузить план</p>
        )}
        {!events.isPending && !events.isError && todayEvents.length === 0 && (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            На сегодня задач нет
          </p>
        )}
        <ul className="space-y-2">
          {todayEvents.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10"
            >
              <span className="font-medium">{event.name}</span>
              <span className="text-xs text-muted-foreground">
                {eventClock(event.start_time)}–{eventClock(event.end_time)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Дедлайны</h3>
          <Link href="/assignments" className="text-sm text-primary">
            Все задания
          </Link>
        </div>
        {deadlines.isPending && (
          <p className="text-sm text-muted-foreground">Загрузка заданий…</p>
        )}
        {deadlines.isError && (
          <p className="text-sm text-destructive">
            Не удалось загрузить задания
          </p>
        )}
        {!deadlines.isPending && !deadlines.isError && nearest.length === 0 && (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
            Заданий пока нет
          </p>
        )}
        <ul className="space-y-2">
          {nearest.map((deadline) => (
            <DeadlineRow key={deadline.id} deadline={deadline} />
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
