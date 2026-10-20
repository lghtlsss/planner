import { apiRequest } from "./client";
import type {
  CreateEventRequest,
  CreateEventResponse,
  Event,
  GetEventsParams,
  MessageResponse,
  UpdateEventRequest,
} from "./types";

function isGetEventsParams(value: unknown): value is GetEventsParams {
  if (!value || typeof value !== "object") return false;
  return !("queryKey" in value);
}

export async function getEvents(params?: GetEventsParams | unknown): Promise<Event[]> {
  const searchParams = new URLSearchParams();
  if (isGetEventsParams(params)) {
    if (params.date) searchParams.set("date", params.date);
    if (params.start_date) searchParams.set("start_date", params.start_date);
    if (params.end_date) searchParams.set("end_date", params.end_date);
  }

  const query = searchParams.toString();
  const path = query ? `/events/all?${query}` : "/events/all";

  const response = await apiRequest<{ events: Event[] }>(path);
  return response.events;
}

export function getEvent(eventId: number): Promise<Event> {
  return apiRequest<Event>(`/events/${eventId}`);
}

export function createEvent(
  data: CreateEventRequest,
): Promise<CreateEventResponse> {
  return apiRequest<CreateEventResponse>("/events/new", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEvent(
  eventId: number,
  data: UpdateEventRequest,
): Promise<Event> {
  return apiRequest<Event>(`/events/update/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteEvent(eventId: number): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/events/delete/${eventId}`, {
    method: "DELETE",
  });
}
