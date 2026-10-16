import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const deadlineSchema = z
  .object({
    title: z.string().trim().min(1, "Введите название"),
    hasDeadline: z.boolean(),
    date: z.string(),
    time: z.string(),
    comment: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasDeadline) return;

    if (!data.date) {
      ctx.addIssue({
        code: "custom",
        message: "Заполните дату",
        path: ["date"],
      });
    }

    if (!data.time) {
      ctx.addIssue({
        code: "custom",
        message: "Заполните время",
        path: ["time"],
      });
    } else if (!timeRegex.test(data.time)) {
      ctx.addIssue({
        code: "custom",
        message: "Введите время в формате ЧЧ:ММ",
        path: ["time"],
      });
    }

    if (data.date && timeRegex.test(data.time)) {
      const combined = new Date(`${data.date}T${data.time}`);
      if (isNaN(combined.getTime()) || combined.getTime() <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          message: "Дата и время должны быть в будущем",
          path: ["time"],
        });
      }
    }
  });

export type DeadlineFormValues = z.infer<typeof deadlineSchema>;
