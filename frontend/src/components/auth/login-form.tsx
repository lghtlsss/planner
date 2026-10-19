"use client";

import * as React from "react";
import { login } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Controller, useForm } from "react-hook-form";
import { LoginFormValues, loginSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm = ({ onSwitchToRegister }: LoginFormProps) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);

  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: () => router.push("/"),
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    mutate(data);
  };

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-h1 text-text-main">Вход</h1>
        <p className="text-body text-text-secondary">
          Войдите по почте и паролю
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
              Неверная почта или пароль
            </span>
            <span className="text-caption text-text-secondary">
              {error.message || "Проверьте данные и попробуйте ещё раз."}
            </span>
          </div>
        </div>
      )}

      <form
        id="login-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <FieldGroup className="gap-4">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-email">Почта</FieldLabel>
                <div className="relative">
                  <Input
                    id="login-email"
                    type="email"
                    required
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
                <FieldLabel htmlFor="login-password">Пароль</FieldLabel>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Введите пароль"
                    required
                    autoComplete="current-password"
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
        </FieldGroup>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending || isSubmitting}
        >
          {isSubmitting || isPending ? "Вход..." : "Войти"}
        </Button>
      </form>

      {onSwitchToRegister && (
        <p className="text-center text-caption text-text-secondary">
          Нет аккаунта?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="cursor-pointer font-semibold text-brand-primary hover:underline"
          >
            Зарегистрироваться
          </button>
        </p>
      )}
    </div>
  );
};
