"use client";

import { Deadline, getDeadlines } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
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

  return (
    <ul className="flex max-h-60 w-full flex-col gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
      {activeDeadlines.length === 0 && !isPending && (
        <li className="py-3 text-center text-caption text-text-secondary">
          Нет активных заданий. Создайте разовую задачу ниже.
        </li>
      )}
      {activeDeadlines.map((deadline) => {
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
              <span className="flex min-w-0 items-center gap-2">
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
                <span className="truncate text-sm font-medium text-text-main">
                  {deadline.title}
                </span>
              </span>
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
            </label>
          </li>
        );
      })}

      {isPending &&
        fallback.map((id) => (
          <li key={id}>
            <Skeleton className="h-10 w-full rounded-xl p-2" />
          </li>
        ))}
    </ul>
  );
};
