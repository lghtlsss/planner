"use client";

import { register } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Controller, useForm } from "react-hook-form";
import { RegisterFormValues, registerSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";
import { useState } from "react";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      register({
        email: values.email,
        password: values.password,
      }),
    onSuccess: () => router.push("/onboarding"),
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    mutate(data);
  };

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 text-text-main">Регистрация</h1>
        <p className="text-body text-text-secondary">
          Создайте аккаунт по почте и паролю
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl bg-danger-light p-3.5 text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] leading-[20px] font-semibold text-text-main">
              Ошибка регистрации
            </span>
            <span className="text-caption text-text-secondary">
              {error.message ||
                "Проверьте введённые данные и попробуйте снова."}
            </span>
          </div>
        </div>
      )}

      <form
        id="register-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <FieldGroup className="gap-4">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="register-email">Почта</FieldLabel>
                <div className="relative">
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="name@mail.ru"
                    autoComplete="email"
                    disabled={isSubmitting || isPending}
                    className="pr-10"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <Mail className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-placeholder" />
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="register-password">Пароль</FieldLabel>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 8 символов"
                    autoComplete="new-password"
                    disabled={isSubmitting || isPending}
                    className="pr-10"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="register-confirm-password">
                  Повторите пароль
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ещё раз пароль"
                    required
                    autoComplete="new-password"
                    disabled={isSubmitting || isPending}
                    className="pr-10"
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-text-placeholder hover:text-text-secondary"
                    aria-label={
                      showConfirmPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting || isPending}
        >
          {isSubmitting || isPending ? "Регистрация..." : "Зарегистрироваться"}
        </Button>
      </form>

      {onSwitchToLogin && (
        <p className="text-center text-caption text-text-secondary">
          Уже есть аккаунт?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="cursor-pointer font-semibold text-brand-primary hover:underline"
          >
            Войти
          </button>
        </p>
      )}
    </div>
  );
};
