"use client";

import { login } from "@/lib/api";
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
import { LoginFormValues, loginSchema } from "./schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

export const LoginForm = () => {
  const router = useRouter();

  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: () => router.push("/"),
  });

  const form = useForm<LoginFormValues>({
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
    <Card size="sm" className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Почта</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={isPending}
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
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    disabled={isPending}
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
          form="login-form"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Вход..." : "Войти"}
        </Button>
      </CardFooter>
    </Card>
  );
};
