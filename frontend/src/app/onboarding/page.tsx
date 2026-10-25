"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
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
  const [groupId, setGroupId] = useState<number | null>(null);
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
  const effectiveGroupId: number | null =
    groupId ?? me.data?.group_id ?? null;

  return (
    <AppShell>
      <div className="rounded-2xl bg-brand-primary-light px-5 py-4 text-[14px] leading-5">
        <p className="flex items-center gap-2 font-semibold text-text-main">
          <Sparkles className="size-4 text-primary" /> Добро пожаловать в
          Планер!
        </p>
        <p className="mt-1 pl-6 text-caption text-text-secondary">
          Заполните профиль, чтобы расписание дня учитывало ваши пары, сон и
          дела. Обязательно указать имя и группу — остальное можно добавить
          позже.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="text-h1">Заполните профиль</h1>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" /> Загрузить расписание
        </Button>
      </div>

      <div className="mt-5 max-w-[740px] space-y-5">
        <section className="rounded-2xl bg-card ring-1 ring-border">
          <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
              <UserRound className="size-4" />
            </span>
            <h2 className="text-h3">Личные данные</h2>
          </div>

          <div className="divide-y divide-border px-5">
            {/* Имя */}
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-6">
              <Label
                htmlFor="onboarding-name"
                className="flex w-36 shrink-0 items-center gap-2 text-[14px] font-normal text-text-secondary sm:pt-2"
              >
                <UserRound className="size-4 text-text-secondary" />
                <span>Имя</span>
                <span className="text-danger">*</span>
              </Label>
              <div className="min-w-0 flex-1">
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
                  <p className="mt-1.5 flex items-center gap-1.5 text-caption text-danger">
                    <AlertCircle className="size-3.5 shrink-0" />
                    Введите имя — это обязательное поле
                  </p>
                )}
              </div>
            </div>

            {/* Группа */}
            <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-6">
              <Label
                htmlFor="onboarding-group"
                className="flex w-36 shrink-0 items-center gap-2 text-[14px] font-normal text-text-secondary sm:pt-2"
              >
                <Users className="size-4 text-text-secondary" />
                <span>Группа</span>
                <span className="text-danger">*</span>
              </Label>
              <div className="min-w-0 flex-1">
                <select
                  id="onboarding-group"
                  value={effectiveGroupId ?? ""}
                  aria-invalid={groupError}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const parsed = raw ? Number.parseInt(raw, 10) : null;
                    setGroupId(
                      parsed != null && !Number.isNaN(parsed) ? parsed : null,
                    );
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
                  <p className="mt-1.5 flex items-center gap-1.5 text-caption text-danger">
                    <AlertCircle className="size-3.5 shrink-0" />
                    Выберите учебную группу — это обязательное поле
                  </p>
                )}
              </div>
            </div>

            {/* Сон */}
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-6">
                <p className="flex w-36 shrink-0 items-center gap-2 text-[14px] text-text-secondary">
                  <Moon className="size-4" /> Сон
                </p>
                <p
                  className={cn(
                    "text-[15px]",
                    me.data?.go_to_sleep_time
                      ? "font-medium text-text-main"
                      : "text-text-placeholder",
                  )}
                >
                  {me.data?.go_to_sleep_time && me.data?.wake_up_time
                    ? `${me.data.go_to_sleep_time} – ${me.data.wake_up_time}`
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
          </div>
        </section>

        <section className="rounded-2xl bg-card ring-1 ring-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-primary-light text-brand-primary">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <h2 className="text-h3">Другие дела</h2>
                <p className="text-caption text-text-secondary">
                  Повторяются каждую неделю
                </p>
              </div>
            </div>
            <OpenRoutineFormButton />
          </div>
          <div className="px-5 py-1">
            <RoutineList emptyVariant="onboarding" />
          </div>
        </section>

        <p className="text-caption text-text-secondary">
          <span className="text-danger">*</span> обязательное поле
        </p>

        <Button
          className="h-12 w-full"
          disabled={save.isPending}
          onClick={() => {
            const trimmedName = effectiveName.trim();
            const hasName = Boolean(trimmedName);
            const hasGroup =
              typeof effectiveGroupId === "number" &&
              Number.isInteger(effectiveGroupId);

            if (!hasName) setNameError(true);
            if (!hasGroup) setGroupError(true);
            if (!hasName || !hasGroup) return;

            save.mutate({
              name: trimmedName,
              group_id: effectiveGroupId,
            });
          }}
        >
          Сохранить и перейти на главную
        </Button>
      </div>

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
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 sm:flex-none"
            onClick={() => setSleepOpen(false)}
          >
            Отмена
          </Button>
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={saveSleep.isPending}
            onClick={() =>
              saveSleep.mutate({
                go_to_sleep_time: sleep.from,
                wake_up_time: sleep.to,
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
