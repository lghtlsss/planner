"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { AlertCircle, Trash2 } from "lucide-react";
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
  const [time, setTime] = useState(initial.time);
  const [comment, setComment] = useState(deadline?.comment ?? "");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Введите название задания");
      if (!noDate) {
        if (!date && !time) {
          throw new Error(
            "Укажите дату в формате дд.мм.гггг или отметьте «Без дедлайна»",
          );
        }
        if (!date) {
          throw new Error(
            "Укажите дату в формате дд.мм.гггг или отметьте «Без дедлайна»",
          );
        }
        if (!time) {
          throw new Error("Укажите время дедлайна");
        }
      }
      const expire_date = noDate
        ? null
        : new Date(`${date}T${time}`).toISOString();
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

  const isTitleInvalid = Boolean(error && !title.trim());
  const isDateInvalid = Boolean(error && !noDate && !date);
  const isTimeInvalid = Boolean(error && !noDate && !time);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={deadline ? "Редактирование задания" : "Новое задание"}
      desktopClassName="sm:max-w-[540px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assignment-title">
            Название <span className="text-danger">*</span>
          </Label>
          <Input
            id="assignment-title"
            placeholder="Например, реферат по истории"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError("");
            }}
            aria-invalid={isTitleInvalid}
          />
          {isTitleInvalid && (
            <p className="flex items-center gap-1.5 text-caption text-danger">
              <AlertCircle className="size-3.5 shrink-0" />
              Введите название задания
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Дедлайн</Label>
            <Label className="cursor-pointer font-normal text-text-main">
              <Checkbox
                checked={noDate}
                onCheckedChange={(checked) => {
                  setNoDate(Boolean(checked));
                  if (error) setError("");
                }}
              />
              Без дедлайна
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={noDate ? "" : date}
              disabled={noDate}
              aria-invalid={isDateInvalid}
              onChange={(event) => {
                setDate(event.target.value);
                if (error) setError("");
              }}
            />
            <Input
              type="time"
              value={noDate ? "" : time}
              disabled={noDate}
              aria-invalid={isTimeInvalid}
              onChange={(event) => {
                setTime(event.target.value);
                if (error) setError("");
              }}
            />
          </div>

          {noDate ? (
            <p className="text-caption text-text-secondary">
              Бессрочное задание: даты и цветового флажка не будет
            </p>
          ) : (
            (isDateInvalid || isTimeInvalid) && (
              <p className="flex items-center gap-1.5 text-caption text-danger">
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </p>
            )
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

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          {deadline ? (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 sm:flex-none"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
