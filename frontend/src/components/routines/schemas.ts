import { z } from "zod";
import type { DayOfWeek } from "@/lib/api";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly DayOfWeek[];

export const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Пн" },
  { value: "tuesday", label: "Вт" },
  { value: "wednesday", label: "Ср" },
  { value: "thursday", label: "Чт" },
  { value: "friday", label: "Пт" },
  { value: "saturday", label: "Сб" },
  { value: "sunday", label: "Вс" },
];

export function formatRoutineDays(days: DayOfWeek[]): string {
  const map = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));
  return days.map((d) => map[d] ?? d).join(", ");
}

export const routineSchema = z
  .object({
    title: z.string().trim().min(1, "Введите название дела"),
    days: z
      .array(z.enum(DAY_VALUES))
      .min(1, "Выберите хотя бы один день"),
    start_time: z
      .string()
      .min(1, "Заполните время")
      .regex(timeRegex, "Введите время в формате ЧЧ:ММ"),
    end_time: z
      .string()
      .min(1, "Заполните время")
      .regex(timeRegex, "Введите время в формате ЧЧ:ММ"),
  })
  .superRefine((data, ctx) => {
    if (
      timeRegex.test(data.start_time) &&
      timeRegex.test(data.end_time) &&
      data.start_time >= data.end_time
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Окончание должно быть позже начала",
        path: ["end_time"],
      });
    }
  });

export type RoutineFormValues = z.infer<typeof routineSchema>;
