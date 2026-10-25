"use client";

import { CheckCircle2, MessageSquare, Pencil } from "lucide-react";
import type { Deadline } from "@/lib/api";
import { formatTime, pillDate } from "@/lib/urgency";
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
  showTime = false,
}: {
  deadline: Deadline;
  done?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  showTime?: boolean;
}) {
  const isCompleted = done ?? Boolean(deadline.completed);
  const timeLabel =
    showTime && deadline.expire_date ? formatTime(deadline.expire_date) : "";

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Checkbox
            className="mt-0.5"
            checked={isCompleted}
            onCheckedChange={() => onToggle()}
            aria-label={
              isCompleted ? "Вернуть задание" : "Отметить выполненным"
            }
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[15px] leading-[22px] font-semibold text-text-main",
                isCompleted && "font-normal text-text-placeholder line-through",
              )}
            >
              {deadline.title}
            </p>
            {isCompleted && (
              <p className="mt-0.5 flex items-center gap-1 text-[13px] leading-[18px] text-success">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>Исчезнет через 12 ч</span>
              </p>
            )}
          </div>
        </div>

        {/* Правая колонка: комментарий (или пустой слот под него), кнопка «Ред.», бейдж даты и (опционально) время */}
        <div className="flex shrink-0 items-center gap-2">
          {deadline.comment ? (
            <Popover>
              <PopoverTrigger
                openOnHover
                delay={150}
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
                align="end"
                className="w-64 rounded-xl bg-text-main p-3 text-white shadow-lg"
              >
                <p className="text-[12px] text-white/70">Комментарий</p>
                <p className="text-[13px] leading-[18px]">{deadline.comment}</p>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="hidden size-8 sm:inline-block" aria-hidden="true" />
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

          {deadline.expire_date && (
            <div className="flex items-center justify-end gap-2 sm:min-w-[74px]">
              <Badge
                variant={getDeadlineBadgeVariant(
                  deadline.expire_date,
                  isCompleted,
                )}
                withDot
              >
                {pillDate(deadline.expire_date)}
              </Badge>
              {showTime && (
                <span className="hidden w-10 text-right text-caption text-text-secondary sm:inline-block">
                  {timeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
