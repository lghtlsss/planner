"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { BrandMark } from "./brand-mark";

export function GuestShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  if (session) return null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-5 pt-14 pb-10">
      <BrandMark />
      {children}
    </div>
  );
}
