"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { getDeadlines, getEvents } from "@/lib/api";
import { addDays, dayTitle, eventOnDay, isoDate, pillDate, startOfWeek } from "@/lib/urgency";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function PlansPage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [pairs, setPairs] = useState(true);
  const [tasks, setTasks] = useState(true);
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const deadlines = useQuery({ queryKey: ["deadlines"], queryFn: getDeadlines });
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);
  const end = addDays(week, 6);

  return (
    <AppShell>
      <h1 className="text-h1">Мои планы</h1>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-[#E3E5EC]" onClick={() => setWeek(addDays(week, -7))} aria-label="Предыдущая неделя">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-[#E3E5EC]" onClick={() => setWeek(addDays(week, 7))} aria-label="Следующая неделя">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <p className="text-[15px] font-semibold">
          {week.getDate()} {week.toLocaleDateString("ru-RU", { month: "long" })} – {end.getDate()} {end.toLocaleDateString("ru-RU", { month: "long" })}
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {days.map((day, index) => {
          const dayEvents = pairs
            ? (events.data ?? []).filter((event) => eventOnDay(event.event_date, day))
            : [];
          const dayTasks = tasks
            ? (deadlines.data ?? []).filter((item) => item.expire_date && eventOnDay(item.expire_date, day))
            : [];
          return (
            <Link key={isoDate(day)} href={`/day?date=${isoDate(day)}`} className="flex gap-3 rounded-3xl bg-card p-3 ring-1 ring-[#E3E5EC]">
              <div className="w-8 text-center">
                <div className="text-[12px] text-text-secondary">{WEEKDAYS[index]}</div>
                <div className="text-h3">{day.getDate()}</div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <p className="text-caption text-text-secondary">Свободный день</p>
                )}
                {dayEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-[#5B6EE1] bg-[#E4E9FF] px-2 py-1 text-[13px]">
                    <span className="text-text-secondary">{event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)} </span>
                    {event.name}
                  </div>
                ))}
                {dayTasks.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-l-4 border-[#F08A4B] bg-[#FFEADF] px-2 py-1 text-[13px]">
                    <span>{item.title}</span>
                    <span className="flex items-center gap-1 text-text-secondary">
                      {item.comment && <MessageSquare className="size-3" />}
                      {pillDate(item.expire_date)}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-[14px]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={pairs} onChange={(event) => setPairs(event.target.checked)} /> Отображать пары</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={tasks} onChange={(event) => setTasks(event.target.checked)} /> Отображать дела</label>
      </div>
      <p className="mt-2 text-caption text-text-secondary">
        Нажмите на день, чтобы открыть его план. «Отображать дела» включает и задачи, и постоянные дела.
      </p>
      <p className="sr-only">{dayTitle(week)}</p>
    </AppShell>
  );
}
