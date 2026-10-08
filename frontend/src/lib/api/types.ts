export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

export interface User {
  name: string;
  surname: string;
  email: string;
}

export interface RegisterRequest {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UpdateUserRequest {
  name?: string;
  surname?: string;
}

export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
}

export interface EventListResponse {
  events: Event[];
}

export interface CreateEventRequest {
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  event_date?: string;
}

export interface CreateEventResponse {
  event: Event;
  intersection: boolean;
}

export interface Deadline {
  id: number;
  title: string;
  description: string | null;
  expire_date: string | null;
  repeat: boolean;
  difficulty: Difficulty | null;
  tag: string | null;
  comment: string | null;
  send_notification: boolean;
}

export interface DeadlineListResponse {
  deadlines: Deadline[];
}

export interface CreateDeadlineRequest {
  title: string;
  description?: string | null;
  expire_date?: string | null;
  repeat?: boolean;
  difficulty?: Difficulty | null;
  tag?: string | null;
  comment?: string | null;
  send_notification?: boolean;
}

export interface UpdateDeadlineRequest {
  title?: string;
  description?: string | null;
  expire_date?: string | null;
  repeat?: boolean;
  difficulty?: Difficulty | null;
  tag?: string | null;
  comment?: string | null;
  send_notification?: boolean;
}

export interface MessageResponse {
  message: string;
}
