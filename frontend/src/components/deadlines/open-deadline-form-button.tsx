"use client";

import { useState } from "react";
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
}

export const OpenDeadlineFormButton = ({
  initialDeadline,
}: OpenDeadlineFormButtonProps) => {
  const [open, setOpen] = useState(false);
  const isEditing = Boolean(initialDeadline);
  const title = isEditing ? "Редактировать задание" : "Новое задание";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{title}</Button>} />
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
