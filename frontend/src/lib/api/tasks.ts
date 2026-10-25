import { apiRequest } from "./client";
import type {
  CreateTaskRequest,
  MessageResponse,
  Task,
  UpdateTaskRequest,
} from "./types";

export function getTask(taskId: number): Promise<Task> {
  return apiRequest<Task>(`/tasks/by_id/${taskId}`);
}

export async function getTasksByDate(taskDate: string): Promise<Task[]> {
  const params = new URLSearchParams({ task_date: taskDate });
  const response = await apiRequest<{ tasks: Task[] }>(
    `/tasks/by_date?${params.toString()}`,
  );
  return response.tasks;
}

export async function getTasksFromTo(
  startDate: string,
  endDate: string,
): Promise<Task[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  const response = await apiRequest<{ tasks: Task[] }>(
    `/tasks/from_to?${params.toString()}`,
  );
  return response.tasks;
}

export function createTask(data: CreateTaskRequest): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(
  taskId: number,
  data: UpdateTaskRequest,
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}
