"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Moon,
  Pencil,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/mobile/app-shell";
import { Sheet } from "@/components/mobile/sheet";
import { ScheduleUploadSheet } from "@/components/planner/schedule-upload-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRoutine,
  deleteRoutine,
  getGroups,
  getMe,
  getRoutines,
  logout,
  updateMe,
  updateRoutine,
  type DayOfWeek,
  type Routine,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "cn";

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Пн" },
  { value: "tuesday", label: "Вт" },
  { value: "wednesday", label: "Ср" },
  { value: "thursday", label: "Чт" },
  { value: "friday", label: "Пт" },
  { value: "saturday", label: "Сб" },
  { value: "sunday", label: "Вс" },
];

export function formatRoutineDays(days: DayOfWeek[]): string {
  const map = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));
  return days.map((d) => map[d] ?? d).join(", ");
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => getGroups({ limit: 2000 }),
  });
  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: getRoutines,
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState<Routine | "new" | null>(null);

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [sleep, setSleep] = useState({ from: "23:00", to: "07:00" });
  const [routineForm, setRoutineForm] = useState<{
    name: string;
    days: DayOfWeek[];
    start_time: string;
    end_time: string;
  }>({
    name: "",
    days: [],
    start_time: "18:00",
    end_time: "20:00",
  });
  const [routineError, setRoutineError] = useState<string | null>(null);

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

  const saveRoutine = useMutation({
    mutationFn: async () => {
      if (!routineForm.name.trim()) {
        throw new Error("Введите название дела");
      }
      if (routineForm.days.length === 0) {
        throw new Error("Выберите хотя бы один день");
      }
      if (
        !routineForm.start_time ||
        !routineForm.end_time ||
        routineForm.start_time >= routineForm.end_time
      ) {
        throw new Error("Окончание должно быть позже начала");
      }

      const payload = {
        name: routineForm.name.trim(),
        days: routineForm.days,
        start_time: routineForm.start_time,
        end_time: routineForm.end_time,
      };

      if (routineOpen && routineOpen !== "new") {
        return updateRoutine(routineOpen.id, payload);
      }
      return createRoutine(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      setRoutineOpen(null);
      setRoutineError(null);
    },
    onError: (err: Error) => {
      setRoutineError(err.message);
    },
  });

  const removeRoutine = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
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

  function openRoutineModal(value: Routine | "new") {
    setRoutineError(null);
    if (value === "new") {
      setRoutineForm({
        name: "",
        days: [],
        start_time: "18:00",
        end_time: "20:00",
      });
    } else {
      setRoutineForm({
        name: value.name,
        days: value.days,
        start_time: value.start_time,
        end_time: value.end_time,
      });
    }
    setRoutineOpen(value);
  }

  function toggleRoutineDay(day: DayOfWeek) {
    setRoutineError(null);
    setRoutineForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  }

  const routines = routinesQuery.data ?? [];

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openRoutineModal("new")}
          >
            + Добавить дело
          </Button>
        </div>

        {routines.length === 0 ? (
          <p className="py-6 text-center text-caption text-text-secondary">
            Пока нет постоянных дел
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {routines.map((item) => (
              <li key={item.id} className="border-l-4 border-delo-bar pl-3">
                <p className="font-semibold text-text-main">{item.name}</p>
                <p className="text-caption text-text-secondary">
                  {formatRoutineDays(item.days)} · {item.start_time.slice(0, 5)}–
                  {item.end_time.slice(0, 5)}
                </p>
                <div className="mt-1.5 flex gap-3 text-[13px]">
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                    onClick={() => openRoutineModal(item)}
                  >
                    <Pencil className="size-3.5" /> Редактировать
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium text-danger hover:underline"
                    disabled={removeRoutine.isPending}
                    onClick={() => removeRoutine.mutate(item.id)}
                  >
                    <Trash2 className="size-3.5" /> Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

      <Sheet
        open={routineOpen != null}
        title={routineOpen === "new" ? "Новое дело" : "Редактирование дела"}
        subtitle="Дело будет повторяться каждую неделю"
        onClose={() => setRoutineOpen(null)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="routine-name">
              Название <span className="text-danger">*</span>
            </Label>
            <Input
              id="routine-name"
              value={routineForm.name}
              onChange={(event) =>
                setRoutineForm({ ...routineForm, name: event.target.value })
              }
              placeholder="Например, секция"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              Дни недели <span className="text-danger">*</span>
            </Label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_OPTIONS.map((day) => {
                const selected = routineForm.days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleRoutineDay(day.value)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg border text-[13px] font-medium transition-colors",
                      selected
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-border-subtle bg-surface text-text-main hover:bg-bg-page",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                Начало <span className="text-danger">*</span>
              </Label>
              <Input
                type="time"
                value={routineForm.start_time}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    start_time: event.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Окончание <span className="text-danger">*</span>
              </Label>
              <Input
                type="time"
                value={routineForm.end_time}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    end_time: event.target.value,
                  })
                }
              />
            </div>
          </div>

          {routineError && (
            <p className="text-caption text-danger">{routineError}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setRoutineOpen(null)}
            >
              Отмена
            </Button>
            <Button
              size="lg"
              disabled={saveRoutine.isPending}
              onClick={() => saveRoutine.mutate()}
            >
              Сохранить
            </Button>
          </div>
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
