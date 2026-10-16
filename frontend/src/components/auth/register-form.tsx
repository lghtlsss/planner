"use client";

import { register } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Controller, useForm } from "react-hook-form";
import { RegisterFormValues, registerSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

export const RegisterForm = () => {
  const router = useRouter();

  const { mutate, error } = useMutation({
    mutationFn: register,
    onSuccess: () => router.push("/"),
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      surname: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    mutate(data);
  };

  return (
    <Card size="sm" className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="name">Имя</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    required
                    placeholder="Алексей"
                    autoComplete="name"
                    disabled={isSubmitting}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="surname"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="surname">Фамилия</FieldLabel>
                  <Input
                    id="surname"
                    type="text"
                    required
                    placeholder="Петров"
                    autoComplete="surname"
                    disabled={isSubmitting}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Почта</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
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
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    {...field}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {error && (
              <p className="text-sm font-medium text-destructive">
                {error.message || "Неверный логин или пароль"}
              </p>
            )}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form="register-form"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Регистрация..." : "Зарегестрироваться"}
        </Button>
      </CardFooter>
    </Card>
  );
};
