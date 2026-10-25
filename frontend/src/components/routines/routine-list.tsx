"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { deleteRoutine, getRoutines, type Routine } from "@/lib/api";
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

  const routines: Routine[] = routinesQuery.data ?? [];

  if (routines.length === 0) {
    if (emptyVariant === "onboarding") {
      return (
        <div className="py-4 text-center">
          <p className="text-h3">Пока нет постоянных дел</p>
          <p className="mt-1 text-caption text-text-secondary">
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
    <ul className="mt-3 space-y-3 text-left">
      {routines.map((item) => (
        <li key={item.id} className="border-l-4 border-delo-bar pl-3">
          <p className="font-semibold text-text-main">{item.title}</p>
          <p className="text-caption text-text-secondary">
            {formatRoutineDays(item.days)} · {item.start_time.slice(0, 5)}–
            {item.end_time.slice(0, 5)}
          </p>
          <div className="mt-1.5 flex gap-3 text-[13px]">
            <OpenRoutineFormButton
              initialRoutine={item}
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <Pencil className="size-3.5" /> Редактировать
                </button>
              }
            />
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
  );
}
