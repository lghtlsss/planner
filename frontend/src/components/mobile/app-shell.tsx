"use client";

import type { ReactNode } from "react";
import { AuthGate } from "./auth-gate";
import { TabBar } from "./tab-bar";

export function AppShell({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <AuthGate>
      <div className="mx-auto min-h-dvh w-full max-w-lg pb-24">
        {(title || action) && (
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {action}
          </header>
        )}
        <main className="px-4 py-4">{children}</main>
        <TabBar />
      </div>
    </AuthGate>
  );
}
