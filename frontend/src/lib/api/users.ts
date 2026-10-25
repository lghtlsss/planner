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

function normalizeGroupId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeUser(raw: User): User {
  return {
    ...raw,
    group_id: normalizeGroupId(raw.group_id),
    go_to_sleep_time: formatTimeField(raw.go_to_sleep_time),
    wake_up_time: formatTimeField(raw.wake_up_time),
  };
}

export async function getMe(): Promise<User> {
  const user = await apiRequest<User>("/users/me");
  return normalizeUser(user);
}

export async function updateMe(data: UpdateUserRequest): Promise<User> {
  const payload: UpdateUserRequest = {
    ...data,
    ...(data.group_id !== undefined
      ? { group_id: normalizeGroupId(data.group_id) }
      : {}),
  };

  try {
    const user = await apiRequest<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeUser(user);
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 422 &&
      typeof payload.wake_up_time === "string"
    ) {
      const wakeUpHour = Number.parseInt(payload.wake_up_time.slice(0, 2), 10);
      if (!Number.isNaN(wakeUpHour)) {
        const fallbackPayload: UpdateUserRequest = {
          ...payload,
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
