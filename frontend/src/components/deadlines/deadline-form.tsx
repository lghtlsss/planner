"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import { deadlineSchema, DeadlineFormValues } from "./schemas";
import { createDeadline, Deadline, updateDeadline } from "@/lib/api";

function splitIsoToLocalInputs(isoString?: string | null): [string, string] {
  const d = isoString ? new Date(isoString) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return [`${year}-${month}-${day}`, `${hours}:${minutes}`];
}

interface DeadlineFormProps {
  initialDeadline?: Deadline;
  onSuccess?: () => void;
}

export function DeadlineForm({
  initialDeadline,
  onSuccess,
}: DeadlineFormProps) {
  const queryClient = useQueryClient();
  const [initialDate, initialTime] = splitIsoToLocalInputs(
    initialDeadline?.expire_date,
  );

  const { handleSubmit, control, clearErrors } = useForm<DeadlineFormValues>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      title: initialDeadline?.title ?? "",
      hasDeadline: initialDeadline
        ? initialDeadline.expire_date !== null
        : true,
      date: initialDate,
      time: initialTime,
      comment: initialDeadline?.comment ?? "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: {
      title: string;
      expire_date: string | null;
      comment: string | null;
    }) =>
      initialDeadline
        ? updateDeadline(initialDeadline.id, payload)
        : createDeadline(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      onSuccess?.();
    },
  });

  const busy = isPending || isDeleting;

  const hasDeadline = useWatch({ control, name: "hasDeadline" });

  function onSubmit(data: DeadlineFormValues) {
    const expire_date =
      data.hasDeadline && data.date && data.time
        ? new Date(`${data.date}T${data.time}`).toISOString()
        : null;

    const trimmedComment = data.comment.trim();

    mutate({
      title: data.title,
      expire_date,
      comment: trimmedComment.length === 0 ? null : trimmedComment,
    });
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-6"
    >
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="title">Название</FieldLabel>
              <Input
                id="title"
                type="text"
                disabled={busy}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="hasDeadline"
          control={control}
          render={({ field: { value, onChange, ...field } }) => (
            <Field className="flex flex-row items-center gap-2 self-end pb-2">
              <FieldLabel htmlFor="hasDeadline" className="mb-0 cursor-pointer">
                Дедлайн
              </FieldLabel>
              <Input
                id="hasDeadline"
                type="checkbox"
                className="size-4 shrink-0 p-0 shadow-none"
                disabled={busy}
                checked={value}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange(checked);
                  if (!checked) {
                    clearErrors(["date", "time"]);
                  }
                }}
                {...field}
              />
            </Field>
          )}
        />

        {hasDeadline && (
          <>
            <Controller
              name="date"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="date">Дата</FieldLabel>
                  <Input
                    id="date"
                    type="date"
                    disabled={busy}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="time"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="time">Время</FieldLabel>
                  <Input
                    id="time"
                    type="time"
                    disabled={busy}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </>
        )}

        <Controller
          name="comment"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor="comment">Комментарий</FieldLabel>
              <Input
                id="comment"
                type="text"
                disabled={busy}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        {initialDeadline && (
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (confirm("Удалить это задание?")) remove();
            }}
          >
            Удалить
          </Button>
        )}
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={isPending}>
              Отмена
            </Button>
          }
        />
        <Button type="submit" disabled={busy}>
          Сохранить
        </Button>
      </DialogFooter>
    </form>
  );
}
