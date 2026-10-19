"use client";

import * as React from "react";
import {
  CalendarCheck,
  Clock,
  Infinity as InfinityIcon,
  MessageSquare,
  Pencil,
  Plus,
} from "lucide-react";
import { AuthScreen } from "@/components/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function Home() {
  const [viewMode, setViewMode] = React.useState<"dashboard" | "auth">("dashboard");

  if (viewMode === "auth") {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("dashboard")}
          >
            Переключить на Главную
          </Button>
        </div>
        <AuthScreen />
      </div>
    );
  }

  return (
    <AppShell userName="Студент" scheduleChanged>
      {/* Шапка страницы (Page 8 / Page 10) */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-text-main">Доброе утро, Студент</h1>
          <p className="text-body text-text-secondary">
            Понедельник, 28 сентября
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("auth")}
          >
            Экран входа
          </Button>
          <Button>
            <Plus className="size-4" />
            Новое задание
          </Button>
        </div>
      </div>

      {/* Сетка карточек Главной страницы */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Левая колонка: Задачи на сегодня */}
        <Card className="lg:col-span-5">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                <CalendarCheck className="size-4" />
              </span>
              <CardTitle>Задачи на сегодня</CardTitle>
            </div>
            <CardAction>
              <span className="text-caption text-text-secondary">5 событий</span>
            </CardAction>
          </CardHeader>

          <CardContent className="flex flex-col gap-3.5 pt-1">
            {/* Событие: Пара */}
            <div className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-right">
                <div className="text-[14px] leading-[18px] font-semibold text-text-main">
                  9:30
                </div>
                <div className="text-[12px] leading-[16px] text-text-placeholder">
                  11:00
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 border-l-[3px] border-para-bar pl-3">
                <span className="text-body-strong text-text-main">
                  Мат. анализ
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="para">Пара</Badge>
                  <span className="text-caption text-text-secondary">
                    к. 2, ауд. 214
                  </span>
                </div>
              </div>
            </div>

            {/* Событие: Пара */}
            <div className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-right">
                <div className="text-[14px] leading-[18px] font-semibold text-text-main">
                  11:10
                </div>
                <div className="text-[12px] leading-[16px] text-text-placeholder">
                  12:40
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 border-l-[3px] border-para-bar pl-3">
                <span className="text-body-strong text-text-main">Физика</span>
                <div className="flex items-center gap-2">
                  <Badge variant="para">Пара</Badge>
                  <span className="text-caption text-text-secondary">
                    к. 1, ауд. 108
                  </span>
                </div>
              </div>
            </div>

            {/* Свободное окно */}
            <div className="ml-15 flex items-center justify-between rounded-xl border border-dashed border-border-strong px-3.5 py-2">
              <span className="text-caption text-text-secondary">
                Свободно 12:40–15:00
              </span>
              <button
                type="button"
                className="cursor-pointer text-[13px] font-medium text-brand-primary hover:underline"
              >
                + Запланировать
              </button>
            </div>

            {/* Событие: Задача */}
            <div className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-right">
                <div className="text-[14px] leading-[18px] font-semibold text-text-main">
                  15:00
                </div>
                <div className="text-[12px] leading-[16px] text-text-placeholder">
                  17:00
                </div>
              </div>
              <div className="flex flex-1 items-start justify-between gap-2 border-l-[3px] border-task-bar pl-3">
                <div className="flex flex-col gap-1">
                  <span className="text-body-strong text-text-main">
                    ДЗ по мат. анализу
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="task">Задача</Badge>
                    <span className="text-caption text-text-secondary">
                      Дедлайн 30 сен
                    </span>
                  </div>
                </div>
                <span className="flex size-7 items-center justify-center rounded-md bg-brand-primary-light text-brand-primary">
                  <MessageSquare className="size-3.5" />
                </span>
              </div>
            </div>

            {/* Событие: Постоянное дело */}
            <div className="flex items-start gap-3">
              <div className="w-12 shrink-0 text-right">
                <div className="text-[14px] leading-[18px] font-semibold text-text-main">
                  18:30
                </div>
                <div className="text-[12px] leading-[16px] text-text-placeholder">
                  20:00
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 border-l-[3px] border-delo-bar pl-3">
                <span className="text-body-strong text-text-main">
                  Английский клуб
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="delo">Дело</Badge>
                  <span className="text-caption text-text-secondary">
                    Постоянное дело
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Правая колонка: Мои дедлайны + Бессрочные задания */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                  <Clock className="size-4" />
                </span>
                <div>
                  <CardTitle>Мои дедлайны</CardTitle>
                  <p className="text-caption text-text-secondary">
                    Сверху — самые срочные
                  </p>
                </div>
              </div>
              <CardAction>
                <span className="cursor-pointer text-[13px] font-semibold text-brand-primary hover:underline">
                  Все задания
                </span>
              </CardAction>
            </CardHeader>

            <CardContent className="divide-y divide-border-subtle px-0 py-0">
              {[
                {
                  id: 1,
                  title: "ДЗ по мат. анализу",
                  date: "30 сен",
                  variant: "deadline-red" as const,
                  hasComment: true,
                },
                {
                  id: 2,
                  title: "Проект по ОРГ",
                  date: "1 окт",
                  variant: "deadline-red" as const,
                  hasComment: true,
                },
                {
                  id: 3,
                  title: "Лабораторная по физике",
                  date: "5 окт",
                  variant: "deadline-yellow" as const,
                  hasComment: false,
                },
                {
                  id: 4,
                  title: "Курсовая работа",
                  date: "30 ноя",
                  variant: "deadline-green" as const,
                  hasComment: true,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox />
                    <span className="text-body text-text-main">{item.title}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-7">
                      {item.hasComment && (
                        <span
                          title="Комментарий к заданию"
                          className="flex size-7 items-center justify-center rounded-md bg-brand-primary-light text-brand-primary"
                        >
                          <MessageSquare className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="xs">
                      <Pencil className="size-3" />
                      Ред.
                    </Button>
                    <Badge variant={item.variant} withDot>
                      {item.date}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                  <InfinityIcon className="size-4" />
                </span>
                <CardTitle>Бессрочные задания</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="divide-y divide-border-subtle px-0 py-0">
              {[
                { id: 1, title: "Разобрать конспекты за семестр", hasComment: true },
                { id: 2, title: "Выучить английские слова", hasComment: false },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox />
                    <span className="text-body text-text-main">{item.title}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-7">
                      {item.hasComment && (
                        <span className="flex size-7 items-center justify-center rounded-md bg-brand-primary-light text-brand-primary">
                          <MessageSquare className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="xs">
                      <Pencil className="size-3" />
                      Ред.
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
