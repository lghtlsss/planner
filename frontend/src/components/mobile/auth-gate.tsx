"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getMe, type User } from "@/lib/api";
import { useSession } from "@/lib/session";

export function isUserAuthorizedAndOnboarded(user: User | undefined): boolean {
  if (!user) return false;
  return (
    user.profile_completed !== false &&
    Boolean(user.name?.trim()) &&
    typeof user.group_id === "number" &&
    Number.isInteger(user.group_id)
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isOnboardingPage = pathname === "/onboarding";

  const me = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: Boolean(session),
  });

  const isOnboarded = isUserAuthorizedAndOnboarded(me.data);

  useEffect(() => {
    if (!session) {
      router.replace("/login");
      return;
    }

    if (me.isSuccess && !isOnboarded && !isOnboardingPage) {
      router.replace("/onboarding");
    }
  }, [session, me.isSuccess, isOnboarded, isOnboardingPage, router]);

  if (!session) return null;
  if (!isOnboardingPage && (!me.isSuccess || !isOnboarded)) return null;

  return children;
}
