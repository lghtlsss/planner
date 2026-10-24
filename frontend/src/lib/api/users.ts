import { apiRequest } from "./client";
import type { MessageResponse, UpdateUserRequest, User } from "./types";

export function getMe(): Promise<User> {
  return apiRequest<User>("/users/me");
}

export function updateMe(data: UpdateUserRequest): Promise<User> {
  return apiRequest<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteMe(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/users/me", { method: "DELETE" });
}
