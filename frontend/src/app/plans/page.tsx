"use client";

import { useQuery } from "@tanstack/react-query";
import { OpenEventFormButton } from "@/components/events";
import { AppShell } from "@/components/mobile/app-shell";
import { getEvents, type Event } from "@/lib/api";
import { eventClock } from "@/lib/urgency";

export default function PlansPage() {
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const grouped = new Map<string, Event[]>();

  for (const event of events.data ?? []) {
    const key = event.event_date.slice(0, 10);
    const list = grouped.get(key) ?? [];
    list.push(event);
    grouped.set(key, list);
  }

  const days = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <AppShell title="Мои планы" action={<OpenEventFormButton />}>
      {events.isPending && (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      )}
      {events.isError && (
        <p className="text-sm text-destructive">Не удалось загрузить планы</p>
      )}
      {!events.isPending && !events.isError && days.length === 0 && (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Планов пока нет
        </p>
      )}
      <div className="space-y-5">
        {days.map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              {new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <ul className="space-y-2">
              {list?.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl bg-card px-3 py-3 ring-1 ring-foreground/10"
                >
                  <p className="font-medium">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {eventClock(event.start_time)}–{eventClock(event.end_time)}
                    {event.description ? ` · ${event.description}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
