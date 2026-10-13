const SESSION_STORAGE_KEY = "planner_session";

export function getSession(): string | null {
  if (typeof window === "undefined") return null;

  const session = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!session) return null;

  return session;
}

export function setSession(session: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_STORAGE_KEY, session);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
