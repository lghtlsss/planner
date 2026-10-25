"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { ScheduleUploadSheet } from "@/components/planner/schedule-upload-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, getScheduleForUser, type LessonOut } from "@/lib/api";
import { addDays, formatWeekRange, isoDate, startOfWeek } from "@/lib/urgency";
import { cn } from "cn";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const DEFAULT_BELL_SLOTS: { start: string; end: string }[] = [
  { start: "09:30", end: "11:00" },
  { start: "11:10", end: "12:40" },
  { start: "13:00", end: "14:30" },
  { start: "14:40", end: "16:10" },
  { start: "16:20", end: "17:50" },
];

function formatShortTime(timeStr: string): string {
  const sliced = timeStr.slice(0, 5);
  return sliced.startsWith("0") ? sliced.slice(1) : sliced;
}

export default function SchedulePage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedMessage, setUploadedMessage] = useState<string | null>(null);
  const [todayIso] = useState(() => isoDate(new Date()));

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const dateFrom = isoDate(week);
  const dateTo = isoDate(addDays(week, 5));
  const groupId = meQuery.data?.group_id ?? null;
  const hasGroup = groupId != null;

  const scheduleQuery = useQuery({
    queryKey: ["schedule", groupId, dateFrom, dateTo],
    queryFn: () =>
      getScheduleForUser(meQuery.data, {
        date_from: dateFrom,
        date_to: dateTo,
      }),
    enabled: hasGroup,
  });

  const days = Array.from({ length: 6 }, (_, index) => addDays(week, index));

  const selectedDateIso = isoDate(days[selectedIndex] ?? days[0]);
  const dayObj = scheduleQuery.data?.days.find(
    (d) => d.date === selectedDateIso,
  );
  const pairs: LessonOut[] = dayObj
    ? [...dayObj.lessons]
        .filter((lesson) => Boolean(lesson.subject))
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];

  const isLoading =
    meQuery.isPending || (hasGroup && scheduleQuery.isPending);

  const loaded = Boolean(
    hasGroup && scheduleQuery.data && scheduleQuery.data.days.length > 0,
  );

  // Собираем временные слоты для десктопной таблицы (стандартные + все слоты из API)
  const slotMap = new Map<string, { start: string; end: string }>();
  for (const slot of DEFAULT_BELL_SLOTS) {
    slotMap.set(`${slot.start}-${slot.end}`, slot);
  }
  for (const d of scheduleQuery.data?.days ?? []) {
    for (const lesson of d.lessons) {
      if (!lesson.subject) continue;
      const start = lesson.start_time.slice(0, 5);
      const end = lesson.end_time.slice(0, 5);
      slotMap.set(`${start}-${end}`, { start, end });
    }
  }
  const timeSlots = Array.from(slotMap.values()).sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Пары</h1>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" /> Загрузить расписание
        </Button>
      </div>

      {isLoading ? (
        <div aria-busy="true">
          <div className="mt-5 flex items-center justify-between md:justify-start md:gap-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="icon" disabled>
                <ChevronLeft className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" disabled>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Skeleton className="h-5 w-44 rounded-lg" />
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-2xl bg-card ring-1 ring-border md:block">
            <div className="grid grid-cols-[88px_repeat(6,1fr)] divide-x divide-border border-b border-border">
              <div className="p-3" />
              {days.map((day) => (
                <div key={isoDate(day)} className="px-3.5 py-3">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
              ))}
            </div>
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="grid min-h-[108px] grid-cols-[88px_repeat(6,1fr)] divide-x divide-border border-b border-border last:border-b-0"
              >
                <div className="space-y-1.5 p-3">
                  <Skeleton className="h-4 w-10 rounded-md" />
                  <Skeleton className="h-3.5 w-10 rounded-md" />
                </div>
                {days.map((day, idx) => (
                  <div key={isoDate(day)} className="p-2">
                    {(row + idx) % 2 === 0 && (
                      <Skeleton className="h-20 w-full rounded-lg" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="md:hidden">
            <div className="mt-3 grid grid-cols-6 gap-2">
              {days.map((day, index) => (
                <div
                  key={isoDate(day)}
                  className={cn(
                    "rounded-2xl py-2 text-center",
                    index === selectedIndex
                      ? "bg-primary text-white"
                      : "bg-card text-text-main ring-1 ring-border",
                  )}
                >
                  <div className="text-[11px] opacity-80">{WEEKDAYS[index]}</div>
                  <div className="text-[16px] font-semibold">
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((id) => (
                <div key={id} className="flex gap-3">
                  <div className="w-12 space-y-1.5 pt-1">
                    <Skeleton className="h-4 w-10 rounded-md" />
                    <Skeleton className="h-4 w-10 rounded-md" />
                  </div>
                  <div className="flex-1 rounded-r-xl border-l-4 border-border bg-card px-3 py-2.5 ring-1 ring-border">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
                    <Skeleton className="mt-2 h-3.5 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !loaded ? (
        <div className="mt-5 rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-primary-light text-primary">
            <BookOpen />
          </span>
          <h2 className="mt-4 text-h3">Расписание ещё не загружено</h2>
          <p className="mx-auto mt-2 max-w-md text-caption text-text-secondary">
            {!hasGroup
              ? "Выберите вашу учебную группу в профиле и подключите ссылку на таблицу — пары появятся здесь и в «Моих планах»."
              : "Вставьте ссылку на таблицу с расписанием — пары появятся здесь и в «Моих планах»."}
          </p>
          <Button className="mt-4 h-11" onClick={() => setUploadOpen(true)}>
            <Upload /> Загрузить расписание
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between md:justify-start md:gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setWeek(addDays(week, -7))}
                aria-label="Предыдущая неделя"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setWeek(addDays(week, 7))}
                aria-label="Следующая неделя"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="text-[16px] font-semibold text-text-main md:text-h3">
              {formatWeekRange(week, addDays(week, 5))}
            </p>
          </div>

          {/* Десктопная таблица расписания на неделю по макету (стр. 26–27) */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl bg-card ring-1 ring-border md:block">
            <div className="grid grid-cols-[88px_repeat(6,minmax(0,1fr))] divide-x divide-border border-b border-border bg-bg-page/40">
              <div className="p-3" />
              {days.map((day, index) => {
                const dayIso = isoDate(day);
                const isToday = dayIso === todayIso;
                return (
                  <div
                    key={dayIso}
                    className="px-3.5 py-3 text-[14px] font-semibold"
                  >
                    <span
                      className={cn(
                        isToday ? "text-brand-primary" : "text-text-main",
                      )}
                    >
                      {WEEKDAYS[index]} {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-border">
              {timeSlots.map((slot) => (
                <div
                  key={`${slot.start}-${slot.end}`}
                  className="grid min-h-[112px] grid-cols-[88px_repeat(6,minmax(0,1fr))] divide-x divide-border"
                >
                  <div className="px-3.5 py-3 text-[13px] leading-5">
                    <div className="font-semibold text-text-main">
                      {formatShortTime(slot.start)}
                    </div>
                    <div className="text-text-secondary">
                      {formatShortTime(slot.end)}
                    </div>
                  </div>

                  {days.map((day) => {
                    const dayIso = isoDate(day);
                    const dObj = scheduleQuery.data?.days.find(
                      (item) => item.date === dayIso,
                    );
                    const cellLessons = (dObj?.lessons ?? []).filter(
                      (lesson) =>
                        Boolean(lesson.subject) &&
                        lesson.start_time.slice(0, 5) === slot.start &&
                        lesson.end_time.slice(0, 5) === slot.end,
                    );

                    return (
                      <div
                        key={dayIso}
                        className="flex min-w-0 flex-col gap-2 p-2"
                      >
                        {cellLessons.map((lesson, idx) => {
                          const location = [
                            lesson.building ? `к. ${lesson.building}` : null,
                            lesson.room ? `ауд. ${lesson.room}` : null,
                          ]
                            .filter(Boolean)
                            .join(", ");

                          return (
                            <article
                              key={`${lesson.subject}_${idx}`}
                              lang="ru"
                              className={cn(
                                "flex min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-r-xl border-l-4 p-2.5",
                                lesson.is_changed
                                  ? "border-deadline-red bg-deadline-red-bg/60"
                                  : "border-para-bar bg-para-bg",
                              )}
                            >
                              <div className="min-w-0">
                                <p className="text-[13px] leading-[18px] font-semibold wrap-anywhere hyphens-auto text-text-main">
                                  {lesson.subject}
                                </p>
                                {location && (
                                  <p className="mt-1 flex min-w-0 items-center gap-1 text-[12px] leading-4 text-text-secondary">
                                    <MapPin className="size-3 shrink-0" />
                                    <span className="truncate">{location}</span>
                                  </p>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {lesson.lesson_type && (
                                  <span className="text-[12px] leading-4 text-text-secondary">
                                    {lesson.lesson_type}
                                  </span>
                                )}
                                {lesson.is_changed && (
                                  <Badge variant="changed">Изменено</Badge>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Мобильный переключатель по дням */}
          <div className="md:hidden">
            <div className="mt-3 grid grid-cols-6 gap-2">
              {days.map((day, index) => {
                const active = index === selectedIndex;
                return (
                  <button
                    key={isoDate(day)}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "rounded-2xl py-2 text-center transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "bg-card text-text-main ring-1 ring-border",
                    )}
                  >
                    <div className="text-[11px] opacity-80">
                      {WEEKDAYS[index]}
                    </div>
                    <div className="text-[16px] font-semibold">
                      {day.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {pairs.length === 0 && (
                <p className="text-text-secondary">В этот день пар нет</p>
              )}
              {pairs.map((lesson, idx) => {
                const location = [
                  lesson.building ? `к. ${lesson.building}` : null,
                  lesson.room ? `ауд. ${lesson.room}` : null,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <article
                    key={`${lesson.start_time}_${lesson.subject}_${idx}`}
                    className="flex gap-3"
                  >
                    <div className="w-12 text-[13px] text-text-secondary">
                      <div className="font-semibold text-text-main">
                        {lesson.start_time.slice(0, 5)}
                      </div>
                      <div>{lesson.end_time.slice(0, 5)}</div>
                    </div>
                    <div
                      className={cn(
                        "flex-1 rounded-r-xl border-l-4 px-3 py-2.5",
                        lesson.is_changed
                          ? "border-deadline-red bg-deadline-red-bg/50"
                          : "border-para-bar bg-para-bg",
                      )}
                    >
                      <p className="font-semibold text-text-main">
                        {lesson.subject}
                      </p>
                      {location && (
                        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-text-secondary">
                          <MapPin className="size-3.5 shrink-0" />
                          <span>{location}</span>
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        {lesson.lesson_type && (
                          <span className="text-caption text-text-secondary">
                            {lesson.lesson_type}
                          </span>
                        )}
                        {lesson.is_changed && (
                          <Badge variant="changed">Изменено</Badge>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}

      {uploadedMessage && (
        <div className="fixed right-4 bottom-20 left-4 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-text-main px-4 py-3 text-white shadow-lg md:right-8 md:bottom-6 md:left-auto md:mx-0">
          <CheckCircle2 className="size-5 shrink-0 text-deadline-green" />
          <span className="text-[14px] font-medium">{uploadedMessage}</span>
        </div>
      )}

      <ScheduleUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(res) => {
          setUploadedMessage(res.message || "Расписание успешно обновлено");
        }}
      />
    </AppShell>
  );
}
