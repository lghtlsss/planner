import { useSyncExternalStore } from "react";
import { Session } from "./types/types";

const SESSION_STORAGE_KEY = "planner_session";

function subscribe(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key && e.key !== SESSION_STORAGE_KEY) return;
    callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function getSnapshot(): Session {
  return (localStorage.getItem(SESSION_STORAGE_KEY) as string) || null;
}

function getServerSnapshot(): Session {
  return null;
}

export const useSession = (): Session => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export const setSession = (newSession: string) => {
  localStorage.setItem(SESSION_STORAGE_KEY, newSession);
  window.dispatchEvent(
    new StorageEvent("storage", { key: SESSION_STORAGE_KEY }),
  );
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(
    new StorageEvent("storage", { key: SESSION_STORAGE_KEY }),
  );
};

export function getSession(): Session {
  if (typeof window === "undefined") return null;

  const session = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!session) return null;

  return session;
}
