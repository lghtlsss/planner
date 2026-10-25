"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Moon,
  Sparkles,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Sheet } from "@/components/mobile/sheet";
import { ScheduleUploadSheet } from "@/components/planner/schedule-upload-sheet";
import { OpenRoutineFormButton, RoutineList } from "@/components/routines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGroups, getMe, updateMe } from "@/lib/api";
import { cn } from "cn";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => getGroups({ limit: 2000 }),
  });

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [nameError, setNameError] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleep, setSleep] = useState({ from: "23:00", to: "07:00" });

  const save = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      void queryClient.invalidateQueries({ queryKey: ["schedule"] });
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

  const groups = groupsQuery.data ?? [];
  const effectiveName = name || me.data?.name || "";
  const effectiveGroupId =
    groupId || (me.data?.group_id != null ? String(me.data.group_id) : "");

  return (
    <AppShell>
      <div className="rounded-3xl bg-brand-primary-light p-4 text-[14px] leading-6">
        <p className="flex items-center gap-2 font-semibold text-text-main">
          <Sparkles className="size-4 text-primary" /> Добро пожаловать в
          Планер!
        </p>
        <p className="mt-1 text-text-secondary">
          Заполните профиль, чтобы расписание дня учитывало ваши пары, сон и
          дела. Обязательно указать имя и группу — остальное можно добавить
          позже.
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
            value={effectiveName}
            placeholder="Как к вам обращаться"
            aria-invalid={nameError}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(false);
            }}
          />
          {nameError && (
            <p className="text-caption text-danger">
              Введите имя — это обязательное поле
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label
            htmlFor="onboarding-group"
            className="flex items-center gap-1.5"
          >
            <Users className="size-4 text-text-secondary" /> Группа{" "}
            <span className="text-danger">*</span>
          </Label>
          <select
            id="onboarding-group"
            value={effectiveGroupId}
            aria-invalid={groupError}
            onChange={(event) => {
              setGroupId(event.target.value);
              if (groupError) setGroupError(false);
            }}
            disabled={groupsQuery.isLoading || save.isPending}
            className={cn(
              "h-10 w-full rounded-[10px] border bg-surface px-3 py-2 text-[15px] leading-[22px] text-text-main transition-colors outline-none focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-bg-page disabled:text-text-placeholder",
              groupError
                ? "border-danger ring-3 ring-danger/15"
                : "border-border-subtle",
            )}
          >
            <option value="">Выберите группу</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {groupError && (
            <p className="text-caption text-danger">
              Выберите учебную группу — это обязательное поле
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

      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-h3">
              <CalendarDays className="size-5 text-primary" /> Другие дела
            </h2>
            <p className="text-caption text-text-secondary">
              Повторяются каждую неделю
            </p>
          </div>
          <OpenRoutineFormButton />
        </div>
        <RoutineList emptyVariant="onboarding" />
      </section>

      <p className="mt-3 text-caption text-danger">* обязательное поле</p>
      <Button
        className="mt-4 h-12 w-full"
        disabled={save.isPending}
        onClick={() => {
          const trimmedName = effectiveName.trim();
          const hasName = Boolean(trimmedName);
          const hasGroup = Boolean(effectiveGroupId);

          if (!hasName) setNameError(true);
          if (!hasGroup) setGroupError(true);
          if (!hasName || !hasGroup) return;

          save.mutate({
            name: trimmedName,
            group_id: Number(effectiveGroupId),
          });
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
