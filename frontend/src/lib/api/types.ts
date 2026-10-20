export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

export interface User {
  name: string;
  surname?: string | null;
  email: string;
  sleepTimeHours: number | null;
  goToSleepTime: string | null;
  wakeUpTime: string | null;
  is_profile_completed: boolean;
}

export interface RegisterRequest {
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
  user?: User;
}

export interface UpdateUserRequest {
  name?: string;
  surname?: string | null;
  goToSleepTime?: string | null;
  wakeUpTime?: string | null;
  sleepTimeHours?: number | null;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Routine {
  id: number;
  name: string;
  days: DayOfWeek[];
  start_time: string;
  end_time: string;
}

export interface CreateRoutineRequest {
  name: string;
  days: DayOfWeek[];
  start_time: string;
  end_time: string;
}

export interface UpdateRoutineRequest {
  name?: string;
  days?: DayOfWeek[];
  start_time?: string;
  end_time?: string;
}

export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
  deadline_id: number | null;
  comment: string | null;
  expire_date: string | null;
  completed: boolean;
}

export interface GetEventsParams {
  date?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
  deadline_id?: number | null;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  event_date?: string;
  deadline_id?: number | null;
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
  completed: boolean;
  completed_at: string | null;
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
  completed?: boolean;
}

export interface MessageResponse {
  message: string;
}

export type DateRuleType = "whole_period" | "range" | "list" | "single";

export type WarningSeverity = "info" | "warning" | "error" | "critical";

export interface ScheduleMetadata {
  faculty: string;
  program: string;
  course: number;
  module: number;
  period_start: string | null;
  period_end: string | null;
  sheet_name: string;
}

export interface Building {
  code: string;
  address: string | null;
}

export interface ScheduleGroupMetadata {
  name: string;
  program: string;
  faculty: string;
  course: number;
  stream_label: string;
}

export interface DateRule {
  type: DateRuleType;
  start_date: string | null;
  end_date: string | null;
  dates: string[];
  excluded_dates: string[];
  raw: string | null;
}

export interface TimeOverride {
  on_date: string;
  start_time: string;
  end_time: string;
}

export interface Lesson {
  group: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;

  subject: string | null;
  lesson_type: string | null;
  teacher: string | null;

  room: string | null;
  building: string | null;
  online: boolean;

  dates: DateRule;

  stream_group: string | null;
  subgroup: string | null;

  time_overrides: TimeOverride[];

  raw_text: string | null;
  source_cell: string | null;
  is_changed?: boolean;
}

export interface ScheduleNote {
  group: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  text: string;
  source_cell: string | null;
}

export interface ScheduleNoteEntry {
  note: ScheduleNote;
}

export type ScheduleEntry = Lesson | ScheduleNoteEntry;

export type ScheduleDay = Partial<Record<DayOfWeek, ScheduleEntry[]>>;

export type ScheduleGroups = Record<string, ScheduleDay>;

export interface ParseWarning {
  severity: WarningSeverity;
  message: string;
  location: string | null;
  raw_value: string | null;
}

export interface ParsedSchedule {
  source: ScheduleMetadata;
  buildings: Record<string, Building>;
  groups: ScheduleGroups;
  warnings: ParseWarning[];
}

export type ScheduleResponse = Record<string, ParsedSchedule>;

export interface UserScheduleResponse {
  schedule: ScheduleResponse | null;
  has_unread_changes: boolean;
  changed_count: number;
  source_name: string | null;
  source_url: string | null;
  updated_at: string | null;
}

export interface UploadScheduleByUrlRequest {
  url: string;
  group?: string;
}
