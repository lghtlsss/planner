"use client";

import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { GuestShell } from "@/components/mobile/guest-shell";

export default function RegisterPage() {
  return (
    <GuestShell>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-primary">
          Войти
        </Link>
      </p>
    </GuestShell>
  );
}
