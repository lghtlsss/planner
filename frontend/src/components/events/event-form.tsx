"use client";

import { createEvent, createTask } from "@/lib/api";
import { EventFormValues, eventSchema } from "./schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { DialogClose } from "../ui/dialog";
import { DeadlineList } from "../deadlines";
import { Button } from "../ui/button";
import { isoDate } from "@/lib/urgency";

interface EventFormProps {
  eventDate?: string;
  onSuccess?: () => void;
}

function formatDurationSummary(
  start: string,
  end: string,
): { valid: boolean; durationText: string; rangeText: string } {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(start) || !timeRegex.test(end) || start >= end) {
    return {
      valid: false,
      durationText: "—",
      rangeText: "Укажите начало и окончание",
    };
  }
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMinutes = eh * 60 + em - (sh * 60 + sm);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const parts: string[] = [];
  if (hours > 0) {
    const mod10 = hours % 10;
    const mod100 = hours % 100;
    const hourWord =
      mod10 === 1 && mod100 !== 11
        ? "час"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
          ? "часа"
          : "часов";
    parts.push(`${hours} ${hourWord}`);
  }
  if (mins > 0) {
    parts.push(`${mins} мин`);
  }

  return {
    valid: true,
    durationText: parts.join(" ") || "0 мин",
    rangeText: `с ${start} до ${end}`,
  };
}

export const EventForm = ({ eventDate, onSuccess }: EventFormProps) => {
  const queryClient = useQueryClient();

  const { handleSubmit, control, setValue, clearErrors, reset } =
    useForm<EventFormValues>({
      resolver: zodResolver(eventSchema),
      defaultValues: {
        isEventOnThisDay: false,
        name: "",
        deadline: undefined,
        start: "",
        end: "",
      },
    });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: EventFormValues) => {
      const targetDate = eventDate ?? isoDate(new Date());

      if (data.isEventOnThisDay) {
        return createEvent({
          name: data.name!.trim(),
          start_time: data.start,
          end_time: data.end,
          event_date: targetDate,
        });
      }

      const deadline = data.deadline!;
      return createTask({
        title: deadline.title,
        description: deadline.description ?? null,
        start_time: data.start,
        potential_end_time: data.end,
        task_date: targetDate,
        deadline_id: deadline.id,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      reset();
      onSuccess?.();
    },
  });

  const isEventOnThisDay = useWatch({ control, name: "isEventOnThisDay" });
  const startValue = useWatch({ control, name: "start" }) ?? "";
  const endValue = useWatch({ control, name: "end" }) ?? "";
  const durationInfo = formatDurationSummary(startValue, endValue);

  const handleToggleMode = () => {
    setValue("isEventOnThisDay", !isEventOnThisDay);
    clearErrors(["name", "deadline"]);
  };

  const onSubmit = (data: EventFormValues) => {
    mutate(data);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-5"
    >
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Левая колонка: выбор задания или разовой задачи */}
        <div className="flex flex-col items-start gap-3">
          <Controller
            name="deadline"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-full">
                <FieldLabel>Из списка заданий</FieldLabel>
                <DeadlineList
                  style="radio"
                  selectedId={isEventOnThisDay ? undefined : field.value?.id}
                  toggleChecked={(dl) => {
                    if (isEventOnThisDay) {
                      setValue("isEventOnThisDay", false);
                      clearErrors(["name", "deadline"]);
                    }
                    field.onChange(dl);
                  }}
                />
                {!isEventOnThisDay && fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <div className="relative flex w-full items-center py-0.5">
            <div className="flex-1 border-t border-border-subtle" />
            <span className="px-3 text-caption text-text-placeholder">или</span>
            <div className="flex-1 border-t border-border-subtle" />
          </div>

          <Button
            type="button"
            variant="dashed"
            className="w-full"
            data-active={isEventOnThisDay}
            onClick={handleToggleMode}
            disabled={isPending}
          >
            + Задача только на этот день
          </Button>

          {isEventOnThisDay && (
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="w-full">
                  <FieldLabel htmlFor="name">
                    Название разовой задачи{" "}
                    <span className="text-danger">*</span>
                  </FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Например, психологический тест"
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  <p className="text-caption text-text-secondary">
                    Не попадает в списки заданий
                  </p>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
        </div>

        {/* Правая колонка: время начала, окончания и продолжительность */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="start"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="start">Начало</FieldLabel>
                  <Input
                    id="start"
                    type="time"
                    disabled={isPending}
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
              name="end"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="end">Окончание</FieldLabel>
                  <Input
                    id="end"
                    type="time"
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <div className="rounded-xl bg-bg-page p-3.5">
            <p className="text-caption text-text-secondary">
              Продолжительность
            </p>
            <p className="mt-0.5 text-h3 text-text-main">
              {durationInfo.durationText}
            </p>
            <p className="mt-0.5 text-caption text-text-secondary">
              {durationInfo.rangeText}
            </p>
          </div>

          <p className="flex items-start gap-2 text-caption text-text-secondary">
            <Info className="mt-0.5 size-4 shrink-0 text-text-placeholder" />
            <span>
              Можно поставить на любое время — даже поверх сна или постоянного
              дела.
            </span>
          </p>
        </div>
      </FieldGroup>

      {error instanceof Error && (
        <p className="text-caption text-danger">{error.message}</p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <DialogClose
          render={
            <Button type="button" variant="outline" size="lg" disabled={isPending}>
              Отмена
            </Button>
          }
        />
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Добавление..." : "Добавить"}
        </Button>
      </div>
    </form>
  );
};
