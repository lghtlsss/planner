"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) router.replace("/login");
  }, [session, router]);

  if (!session) return null;
  return children;
}
