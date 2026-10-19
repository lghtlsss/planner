"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { AppShell } from "@/components/mobile/app-shell";
import { SetThemeButton } from "@/components/set-theme-button";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteMe, getMe, updateMe } from "@/lib/api";
import { clearSession } from "@/lib/session";
import { useRouter } from "next/navigation";

type ProfileValues = {
  name: string;
  surname: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { control, handleSubmit, reset } = useForm<ProfileValues>({
    defaultValues: { name: "", surname: "" },
  });

  useEffect(() => {
    if (me.data) {
      reset({ name: me.data.name, surname: me.data.surname });
    }
  }, [me.data, reset]);

  const save = useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      void queryClient.setQueryData(["me"], user);
    },
  });

  const remove = useMutation({
    mutationFn: deleteMe,
    onSuccess: () => {
      clearSession();
      router.replace("/login");
    },
  });

  return (
    <AppShell title="Профиль" action={<SetThemeButton />}>
      <p className="mb-4 text-sm text-muted-foreground">{me.data?.email}</p>
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        <FieldGroup>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="name">Имя</FieldLabel>
                <Input id="name" {...field} />
              </Field>
            )}
          />
          <Controller
            name="surname"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="surname">Фамилия</FieldLabel>
                <Input id="surname" {...field} />
              </Field>
            )}
          />
        </FieldGroup>
        <Button type="submit" className="w-full" disabled={save.isPending}>
          Сохранить
        </Button>
      </form>
      <div className="mt-6 space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        >
          Выйти
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          disabled={remove.isPending}
          onClick={() => {
            if (confirm("Удалить аккаунт?")) remove.mutate();
          }}
        >
          Удалить аккаунт
        </Button>
      </div>
    </AppShell>
  );
}
