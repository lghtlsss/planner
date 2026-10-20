"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/mobile/app-shell";
import { getDeadlines, getEvents, getMe } from "@/lib/api";
import { dayTitle, eventClock, eventOnDay, isoDate } from "@/lib/urgency";

function DayContent() {
  const params = useSearchParams();
  const date = params.get("date") ?? isoDate(new Date());
  const day = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: getDeadlines });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const pairs = (events.data ?? []).filter((event) => eventOnDay(event.event_date, day));
  const tasks = (deadlines.data ?? []).filter((item) => item.expire_date && eventOnDay(item.expire_date, day));

  return (
    <AppShell>
      <Link href="/plans" className="text-caption text-primary">Мои планы</Link>
      <h1 className="text-h1">{dayTitle(day)}</h1>
      <div className="mt-4 space-y-3">
        {me.data?.goToSleepTime && (
          <p className="rounded-2xl bg-[#F1F0FA] px-3 py-2 text-[13px] text-[#5B6075]">
            Сон · {me.data.goToSleepTime}–{me.data.wakeUpTime}
          </p>
        )}
        {pairs.length === 0 && tasks.length === 0 && (
          <p className="rounded-3xl bg-card p-4 text-text-secondary ring-1 ring-[#E3E5EC]">
            На этот день задач нет
          </p>
        )}
        {pairs.map((event) => (
          <article key={event.id} className="flex gap-3">
            <div className="w-12 text-[13px] text-text-secondary">
              <div>{eventClock(event.start_time)}</div>
              <div>{eventClock(event.end_time)}</div>
            </div>
            <div className="flex-1 border-l-4 border-[#5B6EE1] bg-[#E4E9FF] px-3 py-2">
              <p className="font-semibold">{event.name}</p>
              <p className="text-[13px] text-text-secondary">Пара{event.description ? ` · ${event.description}` : ""}</p>
            </div>
          </article>
        ))}
        {tasks.map((item) => (
          <article key={item.id} className="flex gap-3">
            <div className="w-12 text-[13px] text-text-secondary">день</div>
            <div className="flex-1 border-l-4 border-[#F08A4B] bg-[#FFEADF] px-3 py-2">
              <p className="font-semibold">{item.title}</p>
              <p className="text-[13px] text-text-secondary">Задача</p>
            </div>
          </article>
        ))}
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
