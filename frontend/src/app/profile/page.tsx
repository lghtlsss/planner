"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Moon, Pencil, Trash2, Upload, UserRound } from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Sheet } from "@/components/mobile/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMe, updateMe } from "@/lib/api";
import { getAffairs, saveAffairs } from "@/lib/extras";
import type { Affair } from "@/lib/demo-data";
import { clearSession } from "@/lib/session";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [affairs, setAffairs] = useState<Affair[]>(() =>
    typeof window === "undefined" ? [] : getAffairs(),
  );
  const [nameOpen, setNameOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [affairOpen, setAffairOpen] = useState<Affair | "new" | null>(null);
  const [name, setName] = useState("");
  const [sleep, setSleep] = useState({ from: "23:00", to: "07:00" });
  const [affair, setAffair] = useState({ title: "", when: "" });

  const saveUser = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      setNameOpen(false);
      setSleepOpen(false);
    },
  });

  function openName() {
    setName(me.data?.name ?? "");
    setNameOpen(true);
  }

  function openSleep() {
    setSleep({
      from: me.data?.goToSleepTime ?? "23:00",
      to: me.data?.wakeUpTime ?? "07:00",
    });
    setSleepOpen(true);
  }

  function openAffair(value: Affair | "new") {
    setAffair(value === "new" ? { title: "", when: "" } : { title: value.title, when: value.when });
    setAffairOpen(value);
  }

  function persistAffairs(next: Affair[]) {
    setAffairs(next);
    saveAffairs(next);
  }

  return (
    <AppShell>
      <h1 className="text-h1">Профиль</h1>
      <button type="button" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-card text-[15px] font-medium">
        <Upload className="size-4" /> Загрузить расписание
      </button>
      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-[#E3E5EC]">
        <h2 className="flex items-center gap-2 text-h3"><UserRound className="size-5 text-primary" /> Личные данные</h2>
        <Row label="Имя" required value={me.data?.name || "Не указано"} onEdit={openName} />
        <Row
          label="Сон"
          value={me.data?.goToSleepTime ? `${me.data.goToSleepTime} – ${me.data.wakeUpTime}` : "Не указан"}
          onEdit={openSleep}
          icon={<Moon className="size-4" />}
        />
      </section>
      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-[#E3E5EC]">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-h3"><CalendarDays className="size-5 text-primary" /> Другие дела</h2>
          <button type="button" className="rounded-xl border px-3 py-1.5 text-[13px]" onClick={() => openAffair("new")}>+ Добавить дело</button>
        </div>
        {affairs.length === 0 && (
          <p className="py-6 text-center text-caption text-text-secondary">Пока нет постоянных дел</p>
        )}
        <ul className="mt-3 space-y-3">
          {affairs.map((item) => (
            <li key={item.id} className="border-l-4 border-[#8A90A2] pl-3">
              <p className="font-semibold">{item.title}</p>
              <p className="text-caption text-text-secondary">{item.when}</p>
              <div className="mt-1 flex gap-4 text-[14px]">
                <button type="button" className="flex items-center gap-1 text-primary" onClick={() => openAffair(item)}><Pencil className="size-3.5" /> Редактировать</button>
                <button type="button" className="flex items-center gap-1 text-[#D23B3B]" onClick={() => persistAffairs(affairs.filter((entry) => entry.id !== item.id))}><Trash2 className="size-3.5" /> Удалить</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-3 text-caption text-[#D23B3B]">* обязательное поле</p>
      <Button variant="outline" className="mt-4 h-11 w-full" onClick={() => { clearSession(); router.replace("/login"); }}>
        Выйти
      </Button>

      <Sheet open={nameOpen} title="Имя" onClose={() => setNameOpen(false)}>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к вам обращаться" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => setNameOpen(false)}>Отмена</Button>
          <Button className="h-11" onClick={() => saveUser.mutate({ name })}>Сохранить</Button>
        </div>
      </Sheet>
      <Sheet open={sleepOpen} title="Сон" subtitle="В это время задачи не планируются автоматически" onClose={() => setSleepOpen(false)}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-label">Отбой
            <Input className="mt-1" type="time" value={sleep.from} onChange={(event) => setSleep({ ...sleep, from: event.target.value })} />
          </label>
          <label className="text-label">Подъём
            <Input className="mt-1" type="time" value={sleep.to} onChange={(event) => setSleep({ ...sleep, to: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => setSleepOpen(false)}>Отмена</Button>
          <Button className="h-11" onClick={() => {
            const raw = localStorage.getItem("planner_local_user");
            const user = raw ? JSON.parse(raw) : {};
            localStorage.setItem("planner_local_user", JSON.stringify({ ...user, goToSleepTime: sleep.from, wakeUpTime: sleep.to }));
            void queryClient.invalidateQueries({ queryKey: ["me"] });
            setSleepOpen(false);
          }}>Сохранить</Button>
        </div>
      </Sheet>
      <Sheet open={affairOpen != null} title={affairOpen === "new" ? "Новое дело" : "Редактирование дела"} onClose={() => setAffairOpen(null)}>
        <label className="text-label">Название</label>
        <Input className="mt-1" value={affair.title} onChange={(event) => setAffair({ ...affair, title: event.target.value })} placeholder="Секция, кружок, работа" />
        <label className="mt-3 block text-label">Когда</label>
        <Input className="mt-1" value={affair.when} onChange={(event) => setAffair({ ...affair, when: event.target.value })} placeholder="Вт, Чт · 18:00–20:00" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => setAffairOpen(null)}>Отмена</Button>
          <Button className="h-11" onClick={() => {
            if (!affair.title.trim()) return;
            if (affairOpen && affairOpen !== "new") {
              persistAffairs(affairs.map((item) => item.id === affairOpen.id ? { ...item, ...affair } : item));
            } else {
              persistAffairs([...affairs, { id: Date.now(), title: affair.title.trim(), when: affair.when.trim() }]);
            }
            setAffairOpen(null);
          }}>Сохранить</Button>
        </div>
      </Sheet>
    </AppShell>
  );
}

function Row({
  label,
  value,
  required,
  onEdit,
  icon,
}: {
  label: string;
  value: string;
  required?: boolean;
  onEdit: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-caption text-text-secondary">{icon} {label} {required && <span className="text-[#E5484D]">*</span>}</p>
        <p className="text-[16px]">{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="flex h-9 items-center gap-1 rounded-xl border px-3 text-[13px] text-primary">
        <Pencil className="size-3.5" /> Ред.
      </button>
    </div>
  );
}
