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
import {
  getMe,
  getScheduleForUser,
  type LessonOut,
} from "@/lib/api";
import { addDays, formatWeekRange, isoDate, startOfWeek } from "@/lib/urgency";
import { cn } from "cn";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function SchedulePage() {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedMessage, setUploadedMessage] = useState<string | null>(null);

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

  const loaded = Boolean(
    hasGroup && scheduleQuery.data && scheduleQuery.data.days.length > 0,
  );

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Пары</h1>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" /> Загрузить расписание
        </Button>
      </div>

      {!loaded ? (
        <div className="mt-4 rounded-3xl bg-card px-5 py-8 text-center ring-1 ring-border">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-primary-light text-primary">
            <BookOpen />
          </span>
          <h2 className="mt-4 text-h3">Расписание ещё не загружено</h2>
          <p className="mt-2 text-caption text-text-secondary">
            {!hasGroup
              ? "Выберите вашу учебную группу в профиле и загрузите ссылку на таблицу — пары появятся здесь и в «Моих планах»."
              : "Загрузите Excel-файл из личного кабинета или вставьте ссылку на таблицу — пары появятся здесь и в «Моих планах»."}
          </p>
          <Button className="mt-4 h-11" onClick={() => setUploadOpen(true)}>
            <Upload /> Загрузить расписание
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setWeek(addDays(week, -7))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setWeek(addDays(week, 7))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <p className="text-[14px] font-semibold text-text-main">
              {formatWeekRange(week, addDays(week, 5))}
            </p>
          </div>

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
                  <div className="text-[11px] opacity-80">{WEEKDAYS[index]}</div>
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
        </>
      )}

      {uploadedMessage && (
        <div className="fixed right-4 bottom-20 left-4 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-text-main px-4 py-3 text-white shadow-lg">
          <CheckCircle2 className="size-5 shrink-0 text-deadline-green" />
          <span className="text-[14px] font-medium">{uploadedMessage}</span>
        </div>
      )}

      <ScheduleUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(res) => {
          setUploadedMessage(
            res.message || "Расписание успешно обновлено",
          );
        }}
      />
    </AppShell>
  );
}
