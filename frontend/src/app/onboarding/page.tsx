"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Moon, Sparkles, Upload, UserRound } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Sheet } from "@/components/mobile/sheet";
import { ScheduleUploadSheet } from "@/components/planner/schedule-upload-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMe, getRoutines, updateMe } from "@/lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const routines = useQuery({ queryKey: ["routines"], queryFn: getRoutines });

  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleep, setSleep] = useState({ from: "23:00", to: "07:00" });

  const save = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      router.replace("/");
    },
  });

  const saveSleep = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      setSleepOpen(false);
    },
  });

  return (
    <AppShell>
      <div className="rounded-3xl bg-brand-primary-light p-4 text-[14px] leading-6">
        <p className="flex items-center gap-2 font-semibold text-text-main">
          <Sparkles className="size-4 text-primary" /> Добро пожаловать в Планер!
        </p>
        <p className="mt-1 text-text-secondary">
          Заполните профиль, чтобы расписание дня учитывало сон и ваши дела.
          Обязательно только имя — остальное можно добавить позже.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h1 className="text-h1">Заполните профиль</h1>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" /> Загрузить расписание
        </Button>
      </div>

      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="flex items-center gap-2 text-h3">
          <UserRound className="size-5 text-primary" /> Личные данные
        </h2>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="onboarding-name">
            Имя <span className="text-danger">*</span>
          </Label>
          <Input
            id="onboarding-name"
            value={name}
            placeholder="Как к вам обращаться"
            aria-invalid={error}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(false);
            }}
          />
          {error && (
            <p className="text-caption text-danger">
              Введите имя — это обязательное поле
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-caption text-text-secondary">
              <Moon className="size-4" /> Сон
            </p>
            <p className="text-body text-text-main">
              {me.data?.goToSleepTime
                ? `${me.data.goToSleepTime} – ${me.data.wakeUpTime}`
                : "Не указан"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSleepOpen(true)}
          >
            + Указать
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-4 text-center ring-1 ring-border">
        <div className="flex items-center justify-between text-left">
          <h2 className="flex items-center gap-2 text-h3">
            <CalendarDays className="size-5 text-primary" /> Другие дела
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/profile")}
          >
            + Добавить дело
          </Button>
        </div>
        {(routines.data ?? []).length === 0 ? (
          <>
            <p className="mt-6 text-h3">Пока нет постоянных дел</p>
            <p className="mt-1 text-caption text-text-secondary">
              Секция, работа, кружок — всё, что повторяется каждую неделю. Эти
              дела появятся в расписании дня.
            </p>
          </>
        ) : (
          <p className="mt-4 text-caption text-text-secondary">
            Добавлено постоянных дел: {(routines.data ?? []).length}
          </p>
        )}
      </section>

      <p className="mt-3 text-caption text-danger">* обязательное поле</p>
      <Button
        className="mt-4 h-12 w-full"
        disabled={save.isPending}
        onClick={() => {
          if (!name.trim()) {
            setError(true);
            return;
          }
          save.mutate({ name: name.trim() });
        }}
      >
        Сохранить и перейти на главную
      </Button>

      <Sheet
        open={sleepOpen}
        title="Сон"
        subtitle="В это время задачи не планируются автоматически"
        onClose={() => setSleepOpen(false)}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Отбой</Label>
            <Input
              type="time"
              value={sleep.from}
              onChange={(event) =>
                setSleep({ ...sleep, from: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Подъём</Label>
            <Input
              type="time"
              value={sleep.to}
              onChange={(event) =>
                setSleep({ ...sleep, to: event.target.value })
              }
            />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setSleepOpen(false)}
          >
            Отмена
          </Button>
          <Button
            size="lg"
            disabled={saveSleep.isPending}
            onClick={() =>
              saveSleep.mutate({
                goToSleepTime: sleep.from,
                wakeUpTime: sleep.to,
              })
            }
          >
            Сохранить
          </Button>
        </div>
      </Sheet>

      <ScheduleUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </AppShell>
  );
}
