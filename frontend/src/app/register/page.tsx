"use client";

import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { GuestShell } from "@/components/mobile/guest-shell";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <GuestShell>
      <RegisterForm onSwitchToLogin={() => router.push("/login")} />
    </GuestShell>
  );
}
