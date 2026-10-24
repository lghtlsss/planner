"use client";

import { useState, type ReactElement } from "react";
import { Pencil } from "lucide-react";
import type { Routine } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoutineForm } from "./routine-form";

interface OpenRoutineFormButtonProps {
  initialRoutine?: Routine;
  trigger?: ReactElement;
  label?: string;
}

export const OpenRoutineFormButton = ({
  initialRoutine,
  trigger,
  label,
}: OpenRoutineFormButtonProps) => {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(initialRoutine);
  const title = isEditing ? "Редактирование дела" : "Новое дело";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
            >
              {isEditing ? (
                <>
                  <Pencil className="size-3.5" />
                  {label ?? "Редактировать"}
                </>
              ) : (
                (label ?? "+ Добавить дело")
              )}
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Дело будет повторяться каждую неделю
          </DialogDescription>
        </DialogHeader>
        <RoutineForm
          key={open ? (initialRoutine?.id ?? "new") : "closed"}
          initialRoutine={initialRoutine}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
