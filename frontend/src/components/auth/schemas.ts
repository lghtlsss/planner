import z from "zod";

export const loginSchema = z.object({
  email: z.email("Введите почту, например name@mail.ru"),
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z
  .object({
    email: z.email("Введите почту, например name@mail.ru"),
    password: z.string().min(8, "Минимум 8 символов"),
    confirmPassword: z.string().min(1, "Повторите пароль"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
