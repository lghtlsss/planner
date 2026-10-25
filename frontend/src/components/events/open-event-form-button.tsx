"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { dayTitle } from "@/lib/urgency";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { EventForm } from "./event-form";

export const OpenEventFormButton = ({
  label = "Новая задача",
  eventDate,
}: {
  label?: string;
  eventDate?: string;
}) => {
  const [open, setOpen] = useState(false);
  const subtitle = eventDate
    ? dayTitle(new Date(`${eventDate}T00:00:00`))
    : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-10 sm:h-11">
            <Plus className="size-4" />
            {label}
          </Button>
        }
      />
      <DialogContent className="rounded-2xl p-6 sm:max-w-[660px]">
        <DialogHeader className="mb-1">
          <DialogTitle className="text-h2 text-text-main">{label}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-caption text-text-secondary">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>
        <EventForm eventDate={eventDate} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
