import type {
  CreateDeadlineRequest,
  CreateEventRequest,
  Deadline,
  Event,
  MessageResponse,
  TokenResponse,
  UpdateDeadlineRequest,
  UpdateEventRequest,
  UpdateUserRequest,
  User,
} from "./types";

const USER_KEY = "planner_local_user";
const DEADLINES_KEY = "planner_local_deadlines";
const EVENTS_KEY = "planner_local_events";
const IDS_KEY = "planner_local_ids";

export const LOCAL_SESSION = "local-dev";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(kind: "deadline" | "event") {
  const ids = readJson<Record<string, number>>(IDS_KEY, {
    deadline: 1,
    event: 1,
  });
  const value = ids[kind] ?? 1;
  ids[kind] = value + 1;
  writeJson(IDS_KEY, ids);
  return value;
}

function defaultUser(): User {
  return {
    name: "Студент",
    surname: "",
    email: "dev@local",
    sleepTimeHours: null,
    goToSleepTime: null,
    wakeUpTime: null,
  };
}

function parseBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (body == null) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }
  return {};
}

export function localLogin(): TokenResponse {
  if (!readJson<User | null>(USER_KEY, null)) {
    writeJson(USER_KEY, defaultUser());
  }
  return { access_token: LOCAL_SESSION, token_type: "bearer" };
}

export function localRegister(body: BodyInit | null | undefined): User {
  const data = parseBody(body);
  const user: User = {
    name: String(data.name ?? "Студент"),
    surname: String(data.surname ?? ""),
    email: String(data.email || "dev@local"),
    sleepTimeHours: null,
    goToSleepTime: null,
    wakeUpTime: null,
  };
  writeJson(USER_KEY, user);
  return user;
}

export function handleLocalRequest<T>(
  path: string,
  options: RequestInit = {},
): T {
  const method = (options.method ?? "GET").toUpperCase();
  const pathname = path.split("?")[0];

  if (pathname === "/auth/login" && method === "POST") {
    return localLogin() as T;
  }
  if (pathname === "/auth/register" && method === "POST") {
    return localRegister(options.body) as T;
  }
  if (pathname === "/users/me" && method === "GET") {
    return { ...defaultUser(), ...readJson<Partial<User>>(USER_KEY, {}) } as T;
  }
  if (pathname === "/users/me" && method === "PATCH") {
    const current = readJson<User>(USER_KEY, defaultUser());
    const patch = parseBody(options.body) as UpdateUserRequest;
    const user = { ...current, ...patch };
    writeJson(USER_KEY, user);
    return user as T;
  }
  if (pathname === "/users/me" && method === "DELETE") {
    localStorage.removeItem(USER_KEY);
    return { message: "ok" } satisfies MessageResponse as T;
  }

  if (pathname === "/deadlines" && method === "GET") {
    return {
      deadlines: readJson<Deadline[]>(DEADLINES_KEY, []),
    } as T;
  }
  if (pathname.startsWith("/deadlines/bydate") && method === "GET") {
    const date = new URLSearchParams(path.split("?")[1] ?? "").get("dd_date");
    const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []).filter((item) =>
      item.expire_date?.startsWith(date ?? ""),
    );
    return { deadlines } as T;
  }
  if (pathname.startsWith("/deadlines/get/") && method === "GET") {
    const id = Number(pathname.split("/").at(-1));
    const deadline = readJson<Deadline[]>(DEADLINES_KEY, []).find(
      (item) => item.id === id,
    );
    if (!deadline) throw new Error("Задание не найдено");
    return deadline as T;
  }
  if (pathname === "/deadlines/create" && method === "POST") {
    const data = parseBody(options.body) as unknown as CreateDeadlineRequest;
    const deadline: Deadline = {
      id: nextId("deadline"),
      title: data.title,
      description: data.description ?? null,
      expire_date: data.expire_date ?? null,
      repeat: data.repeat ?? false,
      difficulty: data.difficulty ?? null,
      tag: data.tag ?? null,
      comment: data.comment ?? null,
      send_notification: data.send_notification ?? false,
    };
    const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []);
    deadlines.push(deadline);
    writeJson(DEADLINES_KEY, deadlines);
    return deadline as T;
  }
  if (pathname.startsWith("/deadlines/patch/") && method === "PATCH") {
    const id = Number(pathname.split("/").at(-1));
    const patch = parseBody(options.body) as UpdateDeadlineRequest;
    const deadlines = readJson<Deadline[]>(DEADLINES_KEY, []);
    const index = deadlines.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Задание не найдено");
    deadlines[index] = { ...deadlines[index], ...patch };
    writeJson(DEADLINES_KEY, deadlines);
    return deadlines[index] as T;
  }
  if (pathname.startsWith("/deadlines/delete/") && method === "DELETE") {
    const id = Number(pathname.split("/").at(-1));
    writeJson(
      DEADLINES_KEY,
      readJson<Deadline[]>(DEADLINES_KEY, []).filter((item) => item.id !== id),
    );
    return { message: "ok" } satisfies MessageResponse as T;
  }

  if (pathname === "/events/all" && method === "GET") {
    return { events: readJson<Event[]>(EVENTS_KEY, []) } as T;
  }
  if (pathname.startsWith("/events/new") && method === "POST") {
    const data = parseBody(options.body) as unknown as CreateEventRequest;
    const event: Event = {
      id: nextId("event"),
      name: data.name,
      description: data.description ?? null,
      start_time: data.start_time,
      end_time: data.end_time,
      event_date: data.event_date,
    };
    const events = readJson<Event[]>(EVENTS_KEY, []);
    events.push(event);
    writeJson(EVENTS_KEY, events);
    return { event, intersection: false } as T;
  }
  if (pathname.startsWith("/events/update/") && method === "PATCH") {
    const id = Number(pathname.split("/").at(-1));
    const patch = parseBody(options.body) as UpdateEventRequest;
    const events = readJson<Event[]>(EVENTS_KEY, []);
    const index = events.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Событие не найдено");
    events[index] = { ...events[index], ...patch };
    writeJson(EVENTS_KEY, events);
    return events[index] as T;
  }
  if (pathname.startsWith("/events/delete/") && method === "DELETE") {
    const id = Number(pathname.split("/").at(-1));
    writeJson(
      EVENTS_KEY,
      readJson<Event[]>(EVENTS_KEY, []).filter((item) => item.id !== id),
    );
    return { message: "ok" } satisfies MessageResponse as T;
  }
  if (pathname.startsWith("/events/") && method === "GET") {
    const id = Number(pathname.split("/").at(-1));
    const event = readJson<Event[]>(EVENTS_KEY, []).find((item) => item.id === id);
    if (!event) throw new Error("Событие не найдено");
    return event as T;
  }

  throw new Error(`Нет локального обработчика для ${method} ${path}`);
}
