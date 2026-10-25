"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { deleteRoutine, getRoutines, type Routine } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRoutineDays } from "./schemas";
import { OpenRoutineFormButton } from "./open-routine-form-button";

export function RoutineList({
  emptyVariant = "compact",
}: {
  emptyVariant?: "compact" | "onboarding";
}) {
  const queryClient = useQueryClient();
  const routinesQuery = useQuery({
    queryKey: ["routines"],
    queryFn: getRoutines,
  });

  const removeRoutine = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  if (routinesQuery.isPending) {
    return (
      <ul className="divide-y divide-border text-left" aria-busy="true">
        {[1, 2].map((id) => (
          <li
            key={id}
            className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="border-l-4 border-border pl-3">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="mt-1.5 h-4 w-32 rounded-md" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const routines: Routine[] = routinesQuery.data ?? [];

  if (routines.length === 0) {
    if (emptyVariant === "onboarding") {
      return (
        <div className="py-8 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">
            <CalendarDays className="size-5" />
          </span>
          <p className="text-h3 text-text-main">Пока нет постоянных дел</p>
          <p className="mx-auto mt-1 max-w-sm text-caption text-text-secondary">
            Секция, работа, кружок — всё, что повторяется каждую неделю. Эти дела
            появятся в расписании дня.
          </p>
        </div>
      );
    }

    return (
      <p className="py-6 text-center text-caption text-text-secondary">
        Пока нет постоянных дел
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border text-left">
      {routines.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2.5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="border-l-4 border-delo-bar pl-3">
            <p className="font-semibold text-text-main">{item.title}</p>
            <p className="text-caption text-text-secondary">
              {formatRoutineDays(item.days)} · {item.start_time.slice(0, 5)}–
              {item.end_time.slice(0, 5)}
            </p>
          </div>
          <div className="flex items-center gap-4 pl-4 text-[13px] sm:pl-0">
            <OpenRoutineFormButton
              initialRoutine={item}
              trigger={
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-1.5 font-medium text-brand-primary hover:underline"
                >
                  <Pencil className="size-3.5" /> Редактировать
                </button>
              }
            />
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 font-medium text-danger hover:underline"
              disabled={removeRoutine.isPending}
              onClick={() => removeRoutine.mutate(item.id)}
            >
              <Trash2 className="size-3.5" /> Удалить
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
