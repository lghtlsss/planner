"use client";

import { useState } from "react";
import type { Deadline } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatDue, trafficLabel, trafficLevel } from "@/lib/urgency";
import { OpenDeadlineFormButton } from "./open-deadline-form-button";
import { cn } from "cn";

const pillClass: Record<string, string> = {
  red: "bg-red-500 text-white",
  yellow: "bg-amber-400 text-black",
  green: "bg-emerald-500 text-white",
  none: "bg-muted text-muted-foreground",
};

export function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const [openComment, setOpenComment] = useState(false);
  const level = trafficLevel(deadline.expire_date);

  return (
    <li className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            pillClass[level],
          )}
        >
          {trafficLabel(deadline.expire_date)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{deadline.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDue(deadline.expire_date)}
          </p>
        </div>
        {deadline.comment && (
          <Button
            type="button"
            size="sm"
            variant={openComment ? "default" : "outline"}
            onClick={() => setOpenComment((value) => !value)}
          >
            К
          </Button>
        )}
        <OpenDeadlineFormButton initialDeadline={deadline} />
      </div>
      {openComment && deadline.comment && (
        <p className="mt-2 text-sm text-muted-foreground">{deadline.comment}</p>
      )}
    </li>
  );
}
