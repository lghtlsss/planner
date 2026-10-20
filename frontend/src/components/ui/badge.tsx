import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] leading-[16px] font-semibold whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        /* Светофор дедлайнов: 0–5 дней красный, 6–14 жёлтый, >14 зелёный */
        "deadline-red": "bg-deadline-red-bg text-deadline-red",
        "deadline-yellow": "bg-deadline-yellow-bg text-[#B87D00]",
        "deadline-green": "bg-deadline-green-bg text-deadline-green",
        "deadline-done": "bg-delo-bg text-text-secondary line-through",
        /* Категории: Пара, Задача, Дело, Изменено */
        para: "rounded-md bg-para-bg px-2 py-0.5 text-brand-primary",
        task: "rounded-md bg-task-bg px-2 py-0.5 text-[#C86428]",
        delo: "rounded-md bg-delo-bg px-2 py-0.5 text-text-secondary",
        changed: "rounded-md bg-deadline-red-bg px-2 py-0.5 text-deadline-red",
      },
    },
    defaultVariants: {
      variant: "para",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
}

export function Badge({
  className,
  variant = "para",
  withDot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {withDot && (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            variant === "deadline-red" && "bg-deadline-red",
            variant === "deadline-yellow" && "bg-deadline-yellow",
            variant === "deadline-green" && "bg-deadline-green",
            variant === "deadline-done" && "bg-delo-bar",
          )}
        />
      )}
      {children}
    </span>
  );
}

/**
 * Вычисляет вариант светофора по дате дедлайна согласно UI-kit:
 * 0–5 дней (и просроченные) — красный, 6–14 — жёлтый, больше 14 — зелёный.
 */
export function getDeadlineBadgeVariant(
  expireDate: string | Date,
  isCompleted = false,
): NonNullable<BadgeProps["variant"]> {
  if (isCompleted) return "deadline-done";
  const target = new Date(expireDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 5) return "deadline-red";
  if (diffDays <= 14) return "deadline-yellow";
  return "deadline-green";
}
