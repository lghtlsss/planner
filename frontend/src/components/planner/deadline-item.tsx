"use client";

import { useState } from "react";
import { MessageSquare, Pencil } from "lucide-react";
import type { Deadline } from "@/lib/api";
import { pillDate, trafficLevel } from "@/lib/urgency";
import { cn } from "cn";

const pill: Record<string, string> = {
  red: "bg-[#E5484D] text-white",
  yellow: "bg-[#F2B01E] text-[#1F2333]",
  green: "bg-[#2FA563] text-white",
  none: "bg-[#ECEEF2] text-[#5B6075]",
};

export function DeadlineItem({
  deadline,
  done,
  onToggle,
  onEdit,
}: {
  deadline: Deadline;
  done: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const level = done ? "none" : trafficLevel(deadline.expire_date);

  return (
    <li className="relative py-2">
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={done ? "Вернуть задание" : "Отметить выполненным"}
          onClick={onToggle}
          className={cn(
            "mt-0.5 size-5 shrink-0 rounded-[6px] border",
            done ? "border-primary bg-primary" : "border-[#CDD1DC] bg-white",
          )}
        >
          {done && (
            <span className="block text-center text-[12px] leading-4 text-white">✓</span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-[15px] leading-5", done && "text-text-secondary line-through")}>
              {deadline.title}
            </p>
            {deadline.expire_date && (
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold", pill[level])}>
                {pillDate(deadline.expire_date)}
              </span>
            )}
          </div>
          {done && (
            <p className="mt-1 text-[13px] text-[#1B7A45]">Исчезнет через 12 ч</p>
          )}
          <div className="mt-2 flex gap-2">
            {deadline.comment && (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex size-8 items-center justify-center rounded-xl border border-[#E3E5EC] text-primary"
                aria-label="Комментарий"
              >
                <MessageSquare className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="flex h-8 items-center gap-1 rounded-xl border border-[#E3E5EC] px-2.5 text-[13px] font-medium text-primary"
            >
              <Pencil className="size-3.5" />
              Ред.
            </button>
          </div>
        </div>
      </div>
      {open && deadline.comment && (
        <div className="absolute top-8 left-10 z-10 max-w-[240px] rounded-2xl bg-[#1F2333] px-3 py-2 text-white shadow-lg">
          <p className="text-[12px] text-white/70">Комментарий</p>
          <p className="text-[13px]">{deadline.comment}</p>
        </div>
      )}
    </li>
  );
}
