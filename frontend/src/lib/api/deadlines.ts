import { apiRequest } from "./client";
import type {
  CreateDeadlineRequest,
  Deadline,
  MessageResponse,
  UpdateDeadlineRequest,
} from "./types";

export async function getDeadlines(): Promise<Deadline[]> {
  const response = await apiRequest<{ deadlines: Deadline[] }>("/deadlines");
  return response.deadlines;
}

export async function getDeadlinesByDate(date: string): Promise<Deadline[]> {
  const params = new URLSearchParams({ dd_date: date });
  const response = await apiRequest<{ deadlines: Deadline[] }>(`/deadlines/bydate?${params}`);
  return response.deadlines;
}

export function getDeadline(deadlineId: number): Promise<Deadline> {
  return apiRequest<Deadline>(`/deadlines/get/${deadlineId}`);
}

export function createDeadline(data: CreateDeadlineRequest): Promise<Deadline> {
  return apiRequest<Deadline>("/deadlines/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDeadline(deadlineId: number, data: UpdateDeadlineRequest): Promise<Deadline> {
  return apiRequest<Deadline>(`/deadlines/patch/${deadlineId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteDeadline(deadlineId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/deadlines/delete/${deadlineId}`, {
    method: "DELETE",
  });
}
