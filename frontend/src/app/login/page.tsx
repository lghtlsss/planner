"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { GuestShell } from "@/components/mobile/guest-shell";

export default function LoginPage() {
  const router = useRouter();

  return (
    <GuestShell>
      <LoginForm onSwitchToRegister={() => router.push("/register")} />
    </GuestShell>
  );
}
