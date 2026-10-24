"use client";

import { useState, type ReactElement } from "react";
import { Deadline } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DeadlineForm } from "./deadline-form";

interface OpenDeadlineFormButtonProps {
  initialDeadline?: Deadline;
  trigger?: ReactElement;
}

export const OpenDeadlineFormButton = ({
  initialDeadline,
  trigger,
}: OpenDeadlineFormButtonProps) => {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(initialDeadline);
  const title = isEditing ? "Редактировать задание" : "Новое задание";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size={isEditing ? "sm" : "default"} variant={isEditing ? "outline" : "default"}>
              {isEditing ? "Ред." : "Новое задание"}
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DeadlineForm
          initialDeadline={initialDeadline}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
