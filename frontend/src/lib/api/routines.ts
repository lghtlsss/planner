import { apiRequest } from "./client";
import type {
  CreateRoutineRequest,
  MessageResponse,
  Routine,
  UpdateRoutineRequest,
} from "./types";

export async function getRoutines(): Promise<Routine[]> {
  const response = await apiRequest<{ routines: Routine[] }>("/routines");
  return response.routines;
}

export function createRoutine(data: CreateRoutineRequest): Promise<Routine> {
  return apiRequest<Routine>("/routines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRoutine(
  routineId: number,
  data: UpdateRoutineRequest,
): Promise<Routine> {
  return apiRequest<Routine>(`/routines/${routineId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteRoutine(routineId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/routines/${routineId}`, {
    method: "DELETE",
  });
}
