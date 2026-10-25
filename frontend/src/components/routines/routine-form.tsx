"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  createRoutine,
  updateRoutine,
  type DayOfWeek,
  type Routine,
} from "@/lib/api";
import { DAY_OPTIONS, routineSchema, type RoutineFormValues } from "./schemas";

interface RoutineFormProps {
  initialRoutine?: Routine;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RoutineForm({
  initialRoutine,
  onSuccess,
  onCancel,
}: RoutineFormProps) {
  const queryClient = useQueryClient();

  const { handleSubmit, control, reset } = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      title: initialRoutine?.title ?? "",
      days: initialRoutine?.days ?? [],
      start_time: initialRoutine?.start_time?.slice(0, 5) ?? "18:00",
      end_time: initialRoutine?.end_time?.slice(0, 5) ?? "20:00",
    },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: (values: RoutineFormValues) => {
      const payload = {
        title: values.title.trim(),
        days: values.days,
        start_time: values.start_time,
        end_time: values.end_time,
      };
      return initialRoutine
        ? updateRoutine(initialRoutine.id, payload)
        : createRoutine(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
      reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: RoutineFormValues) => {
    mutate(data);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-5"
    >
      <FieldGroup className="gap-4">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="routine-title">
                Название <span className="text-danger">*</span>
              </FieldLabel>
              <Input
                id="routine-title"
                type="text"
                placeholder="Например, секция"
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
          name="days"
          control={control}
          render={({ field, fieldState }) => {
            const toggleDay = (day: DayOfWeek) => {
              const current = field.value ?? [];
              const next = current.includes(day)
                ? current.filter((d) => d !== day)
                : [...current, day];
              field.onChange(next);
            };

            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>
                  Дни недели <span className="text-danger">*</span>
                </FieldLabel>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_OPTIONS.map((day) => {
                    const selected = (field.value ?? []).includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleDay(day.value)}
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            );
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="start_time"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="routine-start">
                  Начало <span className="text-danger">*</span>
                </FieldLabel>
                <Input
                  id="routine-start"
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
            name="end_time"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="routine-end">
                  Окончание <span className="text-danger">*</span>
                </FieldLabel>
                <Input
                  id="routine-end"
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
      </FieldGroup>

      {error instanceof Error && (
        <p className="text-caption text-danger">{error.message}</p>
      )}

      <DialogFooter>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onCancel}
          >
            Отмена
          </Button>
        ) : (
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isPending}>
                Отмена
              </Button>
            }
          />
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохранение..." : "Сохранить"}
        </Button>
      </DialogFooter>
    </form>
  );
}
