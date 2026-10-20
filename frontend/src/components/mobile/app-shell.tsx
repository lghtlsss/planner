"use client";

import type { ReactNode } from "react";
import { AuthGate } from "./auth-gate";
import { TabBar } from "./tab-bar";
import { ensureDemoData } from "@/lib/demo-data";

export function AppShell({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined") ensureDemoData();

  return (
    <AuthGate>
      <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-5 pb-28">
        {children}
      </div>
      <TabBar />
    </AuthGate>
  );
}
