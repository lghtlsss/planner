"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Moon,
  Pencil,
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
import { getGroups, getMe, logout, updateMe } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => getGroups({ limit: 2000 }),
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [sleep, setSleep] = useState({ from: "23:00", to: "07:00" });

  const saveUser = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      void queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setNameOpen(false);
      setGroupOpen(false);
      setSleepOpen(false);
    },
  });

  const groups = groupsQuery.data ?? [];
  const currentGroup = groups.find((g) => g.id === me.data?.group_id);
  const currentGroupLabel =
    currentGroup?.name ??
    (me.data?.group_id != null ? `ID ${me.data.group_id}` : "Не указана");

  function openName() {
    setName(me.data?.name ?? "");
    setNameOpen(true);
  }

  function openGroup() {
    setGroupId(me.data?.group_id != null ? String(me.data.group_id) : "");
    setGroupOpen(true);
  }

  function openSleep() {
    setSleep({
      from: me.data?.goToSleepTime ?? "23:00",
      to: me.data?.wakeUpTime ?? "07:00",
    });
    setSleepOpen(true);
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">Профиль</h1>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" /> Загрузить расписание
        </Button>
      </div>

      <section className="mt-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="flex items-center gap-2 text-h3">
          <UserRound className="size-5 text-primary" /> Личные данные
        </h2>
        <Row
          label="Имя"
          required
          value={me.data?.name || "Не указано"}
          onEdit={openName}
        />
        <Row
          label="Группа"
          required
          value={currentGroupLabel}
          onEdit={openGroup}
          icon={<Users className="size-4" />}
        />
        <Row
          label="Сон"
          value={
            me.data?.goToSleepTime
              ? `${me.data.goToSleepTime} – ${me.data.wakeUpTime}`
              : "Не указан"
          }
          onEdit={openSleep}
          icon={<Moon className="size-4" />}
        />
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

        <RoutineList />
      </section>

      <p className="mt-3 text-caption text-danger">* обязательное поле</p>
      <Button
        variant="outline"
        className="mt-4 h-11 w-full"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        Выйти
      </Button>

      <Sheet open={nameOpen} title="Имя" onClose={() => setNameOpen(false)}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">
            Имя <span className="text-danger">*</span>
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Как к вам обращаться"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setNameOpen(false)}
          >
            Отмена
          </Button>
          <Button
            size="lg"
            disabled={saveUser.isPending || !name.trim()}
            onClick={() => saveUser.mutate({ name: name.trim() })}
          >
            Сохранить
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={groupOpen}
        title="Группа"
        subtitle="Выберите учебную группу из списка для отображения расписания пар"
        onClose={() => setGroupOpen(false)}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-group">
            Учебная группа <span className="text-danger">*</span>
          </Label>
          <select
            id="profile-group"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            disabled={groupsQuery.isLoading || saveUser.isPending}
            className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface px-3 py-2 text-[15px] leading-[22px] text-text-main transition-colors outline-none focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:bg-bg-page disabled:text-text-placeholder"
          >
            <option value="" disabled>
              Выберите группу
            </option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {groups.length === 0 && !groupsQuery.isLoading && (
            <p className="text-caption text-text-secondary">
              Список групп пока пуст. Загрузите ссылку на расписание через кнопку
              «Загрузить расписание», чтобы группы появились в списке.
            </p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setGroupOpen(false)}
          >
            Отмена
          </Button>
          <Button
            size="lg"
            disabled={saveUser.isPending || !groupId}
            onClick={() =>
              saveUser.mutate({
                group_id: Number(groupId),
              })
            }
          >
            Сохранить
          </Button>
        </div>
      </Sheet>

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
            disabled={saveUser.isPending}
            onClick={() =>
              saveUser.mutate({
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
        <p className="flex items-center gap-2 text-caption text-text-secondary">
          {icon} {label} {required && <span className="text-danger">*</span>}
        </p>
        <p className="text-[16px] text-text-main">{value}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="size-3.5" /> Ред.
      </Button>
    </div>
  );
}
