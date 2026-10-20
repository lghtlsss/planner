import type { Affair } from "@/lib/demo-data";

const DONE_KEY = "planner_done_deadlines";
const AFFAIRS_KEY = "planner_local_affairs";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function doneIds() {
  return new Set(read<number[]>(DONE_KEY, []));
}

export function toggleDone(id: number) {
  const ids = doneIds();
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  localStorage.setItem(DONE_KEY, JSON.stringify([...ids]));
}

export function getAffairs() {
  return read<Affair[]>(AFFAIRS_KEY, []);
}

export function saveAffairs(affairs: Affair[]) {
  localStorage.setItem(AFFAIRS_KEY, JSON.stringify(affairs));
}

export function isOnboarded() {
  return localStorage.getItem("planner_onboarded") === "1";
}

export function setOnboarded() {
  localStorage.setItem("planner_onboarded", "1");
}
