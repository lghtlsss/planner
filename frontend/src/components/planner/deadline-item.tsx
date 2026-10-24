"use client";

import { MessageSquare, Pencil } from "lucide-react";
import type { Deadline } from "@/lib/api";
import { pillDate } from "@/lib/urgency";
import { Badge, getDeadlineBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

export function DeadlineItem({
  deadline,
  done,
  onToggle,
  onEdit,
}: {
  deadline: Deadline;
  done?: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const isCompleted = done ?? Boolean(deadline.completed);

  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-0.5"
          checked={isCompleted}
          onCheckedChange={() => onToggle()}
          aria-label={isCompleted ? "Вернуть задание" : "Отметить выполненным"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-[15px] leading-5 text-text-main",
                isCompleted && "text-text-secondary line-through",
              )}
            >
              {deadline.title}
            </p>
            {deadline.expire_date && (
              <Badge
                variant={getDeadlineBadgeVariant(
                  deadline.expire_date,
                  isCompleted,
                )}
                withDot
              >
                {pillDate(deadline.expire_date)}
              </Badge>
            )}
          </div>
          {isCompleted && (
            <p className="mt-1 text-[13px] text-success">Исчезнет через 12 ч</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {deadline.comment && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      aria-label="Комментарий"
                    />
                  }
                >
                  <MessageSquare className="size-4" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 rounded-xl bg-text-main p-3 text-white shadow-lg"
                >
                  <p className="text-[12px] text-white/70">Комментарий</p>
                  <p className="text-[13px] leading-[18px]">{deadline.comment}</p>
                </PopoverContent>
              </Popover>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
              Ред.
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
