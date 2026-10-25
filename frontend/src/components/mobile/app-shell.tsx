"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "./auth-gate";
import { TabBar } from "./tab-bar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/onboarding";

  return (
    <AuthGate>
      <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-5 pb-28">
        {children}
      </div>
      {!isOnboarding && <TabBar />}
    </AuthGate>
  );
}
