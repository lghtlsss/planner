"use client";

import { useQuery } from "@tanstack/react-query";
import { OpenEventFormButton } from "@/components/events";
import { AppShell } from "@/components/mobile/app-shell";
import { getEvents, type Event } from "@/lib/api";
import { eventClock, eventOnDay } from "@/lib/urgency";

export default function SchedulePage() {
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const today = new Date();
  const pairs = (events.data ?? [])
    .filter((event: Event) => eventOnDay(event.event_date, today))
    .sort((a: Event, b: Event) => a.start_time.localeCompare(b.start_time));

  return (
    <AppShell title="Пары" action={<OpenEventFormButton label="Новая пара" />}>
      <p className="mb-4 text-sm text-muted-foreground">
        Расписание на сегодня
      </p>
      {events.isPending && (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      )}
      {events.isError && (
        <p className="text-sm text-destructive">Не удалось загрузить пары</p>
      )}
      {!events.isPending && !events.isError && pairs.length === 0 && (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          На сегодня пар нет
        </p>
      )}
      <ul className="space-y-2">
        {pairs.map((event) => (
          <li
            key={event.id}
            className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10"
          >
            <p className="font-medium">{event.name}</p>
            <p className="text-xs text-muted-foreground">
              {eventClock(event.start_time)}–{eventClock(event.end_time)}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
