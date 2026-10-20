"use client";

import { createEvent } from "@/lib/api";
import { EventFormValues, eventSchema } from "./schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { DialogClose, DialogFooter } from "../ui/dialog";
import { DeadlineList } from "../deadlines";
import { Button } from "../ui/button";

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

  const { mutate, isPending } = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
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

    const today = eventDate ?? new Date().toLocaleDateString("en-CA");

    mutate({
      name,
      start_time: data.start,
      end_time: data.end,
      event_date: today,
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
                    Название разовой задачи
                  </FieldLabel>
                  <Input
                    id="name"
                    type="text"
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
          )}
        </div>

        <div className="flex flex-col gap-2">
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
      </FieldGroup>

      <DialogFooter>
        <DialogClose
          render={
            <Button type="button" variant="outline" disabled={isPending}>
              Отмена
            </Button>
          }
        />
        <Button type="submit" disabled={isPending}>
          Добавить
        </Button>
      </DialogFooter>
    </form>
  );
};
