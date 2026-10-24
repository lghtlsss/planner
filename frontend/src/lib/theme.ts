"use client";

import { Theme } from "@/lib/types/types";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "app-theme";

function subscribe(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function getSnapshot(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

export const useTheme = (): Theme => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const setTheme = (newTheme: Theme) => {
  localStorage.setItem(STORAGE_KEY, newTheme);
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
};
