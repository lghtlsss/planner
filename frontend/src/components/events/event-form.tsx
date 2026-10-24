"use client";

import { createEvent, type Event } from "@/lib/api";
import { EventFormValues, eventSchema } from "./schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { DialogClose, DialogFooter } from "../ui/dialog";
import { DeadlineList } from "../deadlines";
import { Button } from "../ui/button";
import { isoDate } from "@/lib/urgency";

interface EventFormProps {
  eventDate?: string;
  onSuccess?: () => void;
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
    mutationFn: createEvent,
    onSuccess: async (res) => {
      queryClient.setQueryData<Event[]>(["events"], (old) => {
        if (!old) return [res.event];
        if (old.some((item) => item.id === res.event.id)) return old;
        return [...old, res.event];
      });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      reset();
      onSuccess?.();
    },
  });

  const isEventOnThisDay = useWatch({ control, name: "isEventOnThisDay" });

  const handleToggleMode = () => {
    setValue("isEventOnThisDay", !isEventOnThisDay);
    clearErrors(["name", "deadline"]);
  };

  const onSubmit = (data: EventFormValues) => {
    const name = data.isEventOnThisDay
      ? data.name!.trim()
      : data.deadline!.title;

    const targetDate = eventDate ?? isoDate(new Date());

    mutate({
      name,
      start_time: data.start,
      end_time: data.end,
      event_date: targetDate,
      deadline_id: data.isEventOnThisDay ? null : (data.deadline?.id ?? null),
    });
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="space-y-6"
    >
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col items-start gap-2">
          {!isEventOnThisDay && (
            <Controller
              name="deadline"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="w-full">
                  <FieldLabel>Из списка заданий</FieldLabel>
                  <DeadlineList
                    style="radio"
                    selectedId={field.value?.id}
                    toggleChecked={field.onChange}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}

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
                    Название разовой задачи <span className="text-danger">*</span>
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

        <div className="flex flex-col gap-3">
          <Controller
            name="start"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="start">
                  Начало <span className="text-danger">*</span>
                </FieldLabel>
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
                <FieldLabel htmlFor="end">
                  Окончание <span className="text-danger">*</span>
                </FieldLabel>
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
      </FieldGroup>

      {error instanceof Error && (
        <p className="text-caption text-danger">{error.message}</p>
      )}

      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={isPending}>
              Отмена
            </Button>
          }
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Добавление..." : "Добавить"}
        </Button>
      </DialogFooter>
    </form>
  );
};
