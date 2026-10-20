"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const parsed = parseISO(iso);
  const value = isValid(parsed) ? parsed : new Date(iso);
  if (!isValid(value)) return { date: "", time: "" };
  return {
    date: format(value, "yyyy-MM-dd"),
    time: format(value, "HH:mm"),
  };
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
  const [noDate, setNoDate] = useState(
    deadline ? deadline.expire_date == null : false,
  );
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(
    initial.time === "23:59" ? "" : initial.time,
  );
  const [comment, setComment] = useState(deadline?.comment ?? "");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Введите название задания");
      if (!noDate && !date) {
        throw new Error("Укажите дату или отметьте «Без дедлайна»");
      }
      const expire_date =
        noDate || !date
          ? null
          : new Date(`${date}T${time || "23:59"}`).toISOString();
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
      title={deadline ? "Редактирование задания" : "Новое задание"}
    >
      <div className="flex flex-col gap-4 rounded-3xl bg-card p-4 ring-1 ring-border">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignment-title">
            Название <span className="text-danger">*</span>
          </Label>
          <Input
            id="assignment-title"
            placeholder="Например, реферат по истории"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(error)}
          />
          {error && <p className="text-caption text-danger">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Дедлайн</Label>
            <Label className="cursor-pointer font-normal text-text-secondary">
              <Checkbox
                checked={noDate}
                onCheckedChange={(checked) => setNoDate(Boolean(checked))}
              />
              Без дедлайна
            </Label>
          </div>
          {!noDate ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <Input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-caption text-text-secondary">
              Бессрочное задание: даты и цветового флажка не будет
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignment-comment">Комментарий (по желанию)</Label>
          <Textarea
            id="assignment-comment"
            value={comment}
            maxCount={300}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Заметка для себя"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            Сохранить
          </Button>
        </div>

        {deadline && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Удалить
          </Button>
        )}
      </div>
    </Sheet>
  );
}
