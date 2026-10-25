import { apiRequest } from "./client";
import { ApiError } from "./errors";
import type { MessageResponse, UpdateUserRequest, User } from "./types";

function formatTimeField(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return `${String(value).padStart(2, "0")}:00`;
  }
  return value.slice(0, 5);
}

function normalizeUser(raw: User): User {
  return {
    ...raw,
    group_id: raw.group_id ?? null,
    go_to_sleep_time: formatTimeField(raw.go_to_sleep_time),
    wake_up_time: formatTimeField(raw.wake_up_time),
  };
}

export async function getMe(): Promise<User> {
  const user = await apiRequest<User>("/users/me");
  return normalizeUser(user);
}

export async function updateMe(data: UpdateUserRequest): Promise<User> {
  try {
    const user = await apiRequest<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return normalizeUser(user);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 422 &&
      typeof data.wake_up_time === "string"
    ) {
      const wakeUpHour = Number.parseInt(data.wake_up_time.slice(0, 2), 10);
      if (!Number.isNaN(wakeUpHour)) {
        const fallbackPayload: UpdateUserRequest = {
          ...data,
          wake_up_time: wakeUpHour,
        };
        const user = await apiRequest<User>("/users/me", {
          method: "PATCH",
          body: JSON.stringify(fallbackPayload),
        });
        return normalizeUser(user);
      }
    }
    throw err;
  }
}

export function deleteMe(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/users/me", { method: "DELETE" });
}
