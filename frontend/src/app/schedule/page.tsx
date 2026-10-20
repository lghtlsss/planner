"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Sheet } from "@/components/mobile/sheet";
import { Button } from "@/components/ui/button";
import { getEvents } from "@/lib/api";
import { addDays, eventOnDay, isoDate, startOfWeek } from "@/lib/urgency";
import { cn } from "cn";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function SchedulePage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [upload, setUpload] = useState(false);
  const [fileName, setFileName] = useState("");
  const events = useQuery({ queryKey: ["events"], queryFn: getEvents });
  const days = useMemo(() => Array.from({ length: 6 }, (_, index) => addDays(week, index)), [week]);
  const pairs = (events.data ?? [])
    .filter((event) => eventOnDay(event.event_date, selected))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const loaded = (events.data ?? []).length > 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Пары</h1>
        <button type="button" onClick={() => setUpload(true)} className="flex h-11 items-center gap-2 rounded-2xl border bg-card px-3 text-[14px] font-medium">
          <Upload className="size-4" /> Загрузить расписание
        </button>
      </div>
      {!loaded ? (
        <div className="mt-4 rounded-3xl bg-card px-5 py-8 text-center ring-1 ring-[#E3E5EC]">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#EEF0FD] text-primary">
            <BookOpen />
          </span>
          <h2 className="mt-4 text-h3">Расписание ещё не загружено</h2>
          <p className="mt-2 text-caption text-text-secondary">
            Загрузите Excel-файл из личного кабинета или вставьте ссылку на таблицу — пары появятся здесь и в «Моих планах».
          </p>
          <Button className="mt-4 h-11" onClick={() => setUpload(true)}>
            <Upload /> Загрузить расписание
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-[#E3E5EC]" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft className="size-4" /></button>
              <button type="button" className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-[#E3E5EC]" onClick={() => setWeek(addDays(week, 7))}><ChevronRight className="size-4" /></button>
            </div>
            <p className="text-[14px] font-semibold">
              {week.getDate()} {week.toLocaleDateString("ru-RU", { month: "long" })} – {addDays(week, 5).getDate()} {addDays(week, 5).toLocaleDateString("ru-RU", { month: "long" })}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2">
            {days.map((day, index) => {
              const active = isoDate(day) === isoDate(selected);
              return (
                <button key={isoDate(day)} type="button" onClick={() => setSelected(day)} className={cn("rounded-2xl py-2 text-center", active ? "bg-primary text-white" : "bg-card ring-1 ring-[#E3E5EC]")}>
                  <div className="text-[11px]">{WEEKDAYS[index]}</div>
                  <div className="text-[16px] font-semibold">{day.getDate()}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-3">
            {pairs.length === 0 && <p className="text-text-secondary">В этот день пар нет</p>}
            {pairs.map((event) => (
              <article key={event.id} className="flex gap-3">
                <div className="w-12 text-[13px] text-text-secondary">
                  <div>{event.start_time.slice(0, 5)}</div>
                  <div>{event.end_time.slice(0, 5)}</div>
                </div>
                <div className="flex-1 border-l-4 border-[#5B6EE1] bg-[#E4E9FF] px-3 py-2">
                  <p className="font-semibold">{event.name}</p>
                  {event.description && <p className="text-[13px] text-text-secondary">{event.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <Sheet open={upload} title="Загрузка расписания" onClose={() => setUpload(false)}>
        <p className="text-label">Файл Excel</p>
        <label className="mt-2 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-[#CDD1DC] px-4 py-8 text-center">
          <Upload className="size-6 text-primary" />
          <span className="mt-2 text-[15px]">Перетащите файл или нажмите, чтобы выбрать</span>
          <span className="text-caption text-text-secondary">Формат .xlsx, до 10 МБ</span>
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>
        {fileName && <p className="mt-3 text-[14px]">Выбран файл: {fileName}</p>}
        <p className="mt-4 text-caption text-text-secondary">
          Разбор Excel-таблицы живёт в бэкенде. Здесь можно выбрать файл, но пары из него пока не подставляются.
        </p>
      </Sheet>
    </AppShell>
  );
}
