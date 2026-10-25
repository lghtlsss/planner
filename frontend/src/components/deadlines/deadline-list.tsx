"use client";

import { Deadline, getDeadlines } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Badge, getDeadlineBadgeVariant } from "../ui/badge";
import { pillDate } from "@/lib/urgency";
import { cn } from "cn";

const fallback = [1, 2, 3];

type Props = {
  style?: "default" | "checkbox" | "radio";
  selectedId?: number;
  toggleChecked?: (deadline: Deadline) => void;
};

export const DeadlineList = ({
  style = "default",
  selectedId,
  toggleChecked,
}: Props) => {
  const { data, isPending } = useQuery({
    queryKey: ["deadlines"],
    queryFn: getDeadlines,
  });

  const activeDeadlines = (data ?? []).filter((d) => !d.completed);
  const openDeadlines = activeDeadlines.filter((d) => !d.expire_date);
  const datedDeadlines = [...activeDeadlines]
    .filter((d) => Boolean(d.expire_date))
    .sort((a, b) => +new Date(a.expire_date!) - +new Date(b.expire_date!));

  const renderRow = (deadline: Deadline) => {
    const isSelected = selectedId === deadline.id;
    return (
      <li key={deadline.id}>
        <label
          className={cn(
            "flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
            isSelected
              ? "border-brand-primary bg-brand-primary-light"
              : "border-transparent hover:bg-bg-page",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {style === "checkbox" && (
              <input
                type="checkbox"
                checked={Boolean(deadline.completed)}
                onChange={() => toggleChecked?.(deadline)}
                className="size-4 shrink-0 accent-brand-primary"
              />
            )}
            {style === "radio" && (
              <input
                type="radio"
                name="deadlines"
                checked={isSelected}
                onChange={() => toggleChecked?.(deadline)}
                className="size-4 shrink-0 accent-brand-primary"
              />
            )}
            <span
              className={cn(
                "truncate text-[14px] leading-5 text-text-main",
                isSelected ? "font-semibold" : "font-medium",
              )}
            >
              {deadline.title}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {deadline.comment && (
              <MessageSquare className="size-3.5 text-text-placeholder" />
            )}
            {deadline.expire_date && (
              <Badge
                variant={getDeadlineBadgeVariant(
                  deadline.expire_date,
                  Boolean(deadline.completed),
                )}
                withDot
              >
                {pillDate(deadline.expire_date)}
              </Badge>
            )}
          </span>
        </label>
      </li>
    );
  };

  return (
    <div className="flex max-h-64 w-full flex-col gap-2 overflow-y-auto rounded-xl border border-border p-2">
      {activeDeadlines.length === 0 && !isPending && (
        <p className="py-3 text-center text-caption text-text-secondary">
          Нет активных заданий. Создайте разовую задачу ниже.
        </p>
      )}

      {openDeadlines.length > 0 && (
        <div>
          <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-text-placeholder uppercase">
            Бессрочные
          </p>
          <ul className="flex flex-col gap-1">
            {openDeadlines.map(renderRow)}
          </ul>
        </div>
      )}

      {datedDeadlines.length > 0 && (
        <div>
          <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-text-placeholder uppercase">
            С дедлайном
          </p>
          <ul className="flex flex-col gap-1">
            {datedDeadlines.map(renderRow)}
          </ul>
        </div>
      )}

      {isPending && (
        <ul className="flex flex-col gap-1.5">
          {fallback.map((id) => (
            <li key={id}>
              <Skeleton className="h-10 w-full rounded-xl p-2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
