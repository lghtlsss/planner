"use client";

import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { getMe } from "@/lib/api";
import { getSession } from "@/lib/session";

export default function Home() {
  const session = getSession();
  console.log(session);
  return (
    <>
      <RegisterForm />
      <LoginForm />
      <Button onClick={() => getMe().then((data) => console.log(data))}>
        Получить данные о пользователе
      </Button>
    </>
  );
}
