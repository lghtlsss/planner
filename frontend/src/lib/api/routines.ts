import { apiRequest } from "./client";
import { ApiError } from "./errors";
import type {
  CreateRoutineRequest,
  DayOfWeek,
  MessageResponse,
  Routine,
  UpdateRoutineRequest,
} from "./types";

const ALL_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function extractRoutines(
  response: { routines?: Routine[] } | Routine[],
): Routine[] {
  if (Array.isArray(response)) return response;
  return response.routines ?? [];
}

export function getRoutine(routineId: number): Promise<Routine> {
  return apiRequest<Routine>(`/routines/by_id/${routineId}`);
}

export async function getRoutinesByDay(day: DayOfWeek): Promise<Routine[]> {
  const params = new URLSearchParams({ day });
  const response = await apiRequest<{ routines: Routine[] }>(
    `/routines/by_day?${params.toString()}`,
  );
  return response.routines;
}

export async function getRoutines(): Promise<Routine[]> {
  try {
    const response = await apiRequest<{ routines: Routine[] } | Routine[]>(
      "/routines",
    );
    return extractRoutines(response);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      try {
        const response = await apiRequest<{ routines: Routine[] } | Routine[]>(
          "/routines/all",
        );
        return extractRoutines(response);
      } catch (innerErr) {
        if (
          innerErr instanceof ApiError &&
          (innerErr.status === 404 || innerErr.status === 405)
        ) {
          const perDay = await Promise.all(
            ALL_DAYS.map((day) => getRoutinesByDay(day)),
          );
          const byId = new Map<number, Routine>();
          for (const list of perDay) {
            for (const item of list) {
              byId.set(item.id, item);
            }
          }
          return Array.from(byId.values());
        }
        throw innerErr;
      }
    }
    throw err;
  }
}

export function createRoutine(data: CreateRoutineRequest): Promise<Routine> {
  return apiRequest<Routine>("/routines/create", {
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
