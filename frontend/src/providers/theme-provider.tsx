"use client";

import { Theme } from "@/lib/types/types";
import { createContext, ReactNode, useSyncExternalStore } from "react";

export const ThemeContext = createContext<Theme | undefined>(undefined);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): Theme {
  return (localStorage.getItem("app-theme") as Theme) || "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
