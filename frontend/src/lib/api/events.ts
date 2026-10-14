import { apiRequest } from "./client";
import type {
  CreateEventRequest,
  CreateEventResponse,
  Event,
  MessageResponse,
  UpdateEventRequest,
} from "./types";

export async function getEvents(): Promise<Event[]> {
  const response = await apiRequest<{ events: Event[] }>("/events/all");
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
