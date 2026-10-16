import { z } from "zod";
import { Deadline } from "@/lib/api";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const eventSchema = z
  .object({
    isEventOnThisDay: z.boolean(),
    name: z.string().optional(),
    deadline: z.custom<Deadline>().optional(),
    start: z
      .string()
      .min(1, "Заполните время")
      .regex(timeRegex, "Введите время в формате ЧЧ:ММ"),
    end: z
      .string()
      .min(1, "Заполните время")
      .regex(timeRegex, "Введите время в формате ЧЧ:ММ"),
  })
  .superRefine((data, ctx) => {
    if (data.isEventOnThisDay) {
      if (!data.name || data.name.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Введите название задачи",
          path: ["name"],
        });
      }
    } else {
      if (!data.deadline) {
        ctx.addIssue({
          code: "custom",
          message: "Выберите дедлайн из списка или создайте разовую задачу",
          path: ["deadline"],
        });
      }
    }

    if (
      timeRegex.test(data.start) &&
      timeRegex.test(data.end) &&
      data.start >= data.end
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Время окончания должно быть позже времени начала",
        path: ["end"],
      });
    }
  });

export type EventFormValues = z.infer<typeof eventSchema>;
