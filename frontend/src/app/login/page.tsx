"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { GuestShell } from "@/components/mobile/guest-shell";

export default function LoginPage() {
  return (
    <GuestShell>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-primary">
          Регистрация
        </Link>
      </p>
    </GuestShell>
  );
}
