"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/mobile/sheet";
import {
  createDeadline,
  updateDeadline,
  deleteDeadline,
  type Deadline,
} from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function split(iso?: string | null) {
  if (!iso) return { date: "", time: "" };
  const value = new Date(iso);
  const date = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function AssignmentSheet({
  open,
  deadline,
  onClose,
}: {
  open: boolean;
  deadline?: Deadline;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const initial = split(deadline?.expire_date);
  const [title, setTitle] = useState(deadline?.title ?? "");
  const [noDate, setNoDate] = useState(deadline ? deadline.expire_date == null : false);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time === "23:59" ? "" : initial.time);
  const [comment, setComment] = useState(deadline?.comment ?? "");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Введите название задания");
      if (!noDate && !date) throw new Error("Укажите дату или отметьте «Без дедлайна»");
      const expire_date = noDate || !date ? null : new Date(`${date}T${time || "23:59"}`).toISOString();
      const payload = {
        title: title.trim(),
        expire_date,
        comment: comment.trim() || null,
      };
      if (deadline) return updateDeadline(deadline.id, payload);
      return createDeadline(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      onClose();
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteDeadline(deadline!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      onClose();
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={deadline ? "Редактирование" : "Новое задание"}
    >
      <div className="rounded-3xl bg-white p-4 ring-1 ring-[#E3E5EC]">
        <label className="text-label">
          Название <span className="text-[#E5484D]">*</span>
        </label>
        <Input
          className="mt-2"
          placeholder="Например, реферат по истории"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {error && <p className="mt-1 text-[13px] text-[#D23B3B]">{error}</p>}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-label">Дедлайн</span>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={noDate}
              onChange={(event) => setNoDate(event.target.checked)}
            />
            Без дедлайна
          </label>
        </div>
        {!noDate && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </div>
        )}
        <label className="mt-4 block text-label">Комментарий (по желанию)</label>
        <textarea
          value={comment}
          maxLength={300}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Заметка для себя"
          className="mt-2 h-28 w-full rounded-[10px] border border-[#E3E5EC] p-3 text-[15px] outline-none"
        />
        <p className="text-right text-[12px] text-text-secondary">{comment.length} / 300</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" className="h-11" disabled={save.isPending} onClick={() => save.mutate()}>
            Сохранить
          </Button>
        </div>
        {deadline && (
          <Button
            type="button"
            variant="destructive"
            className="mt-2 h-11 w-full"
            onClick={() => remove.mutate()}
          >
            Удалить
          </Button>
        )}
      </div>
    </Sheet>
  );
}
