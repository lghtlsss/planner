"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Moon, Sparkles, Upload, UserRound } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateMe } from "@/lib/api";
import { setOnboarded } from "@/lib/extras";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const save = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      setOnboarded();
      router.replace("/");
    },
  });

  return (
    <AppShell>
      <div className="rounded-3xl bg-[#EEF0FD] p-4 text-[14px] leading-6">
        <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" /> Добро пожаловать в Планер!</p>
        <p className="mt-1 text-text-secondary">
          Заполните профиль, чтобы расписание дня учитывало сон и ваши дела. Обязательно только имя — остальное можно добавить позже.
        </p>
      </div>
      <h1 className="mt-5 text-h1">Заполните профиль</h1>
      <button type="button" className="mt-4 flex h-12 items-center gap-2 rounded-2xl border bg-card px-4 text-[15px] font-medium">
        <Upload className="size-4" /> Загрузить расписание
      </button>
      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-[#E3E5EC]">
        <h2 className="flex items-center gap-2 text-h3"><UserRound className="size-5 text-primary" /> Личные данные</h2>
        <label className="mt-4 block text-caption text-text-secondary">Имя <span className="text-[#E5484D]">*</span></label>
        <Input className="mt-1" value={name} placeholder="Как к вам обращаться" onChange={(event) => setName(event.target.value)} />
        {error && <p className="mt-1 text-[13px] text-[#D23B3B]">Укажите, как к вам обращаться</p>}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-caption text-text-secondary"><Moon className="size-4" /> Сон</p>
            <p>Не указан</p>
          </div>
          <span className="rounded-xl border px-3 py-1.5 text-[13px]">+ Указать</span>
        </div>
      </section>
      <section className="mt-4 rounded-3xl bg-card p-4 text-center ring-1 ring-[#E3E5EC]">
        <div className="flex items-center justify-between text-left">
          <h2 className="flex items-center gap-2 text-h3"><CalendarDays className="size-5 text-primary" /> Другие дела</h2>
          <span className="rounded-xl border px-3 py-1.5 text-[13px]">+ Добавить дело</span>
        </div>
        <p className="mt-6 text-h3">Пока нет постоянных дел</p>
        <p className="mt-1 text-caption text-text-secondary">Секция, работа, кружок — всё, что повторяется каждую неделю. Эти дела появятся в расписании дня.</p>
      </section>
      <p className="mt-3 text-caption text-[#D23B3B]">* обязательное поле</p>
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
    </AppShell>
  );
}
