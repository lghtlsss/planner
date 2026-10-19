export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

export interface User {
  name: string;
  surname: string;
  email: string;
  sleepTimeHours: number | null;
  goToSleepTime: string | null;
  wakeUpTime: string | null;
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

// ---------- Schedule enums ----------

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DateRuleType = "whole_period" | "range" | "list" | "single";

export type WarningSeverity = "info" | "warning" | "error" | "critical";

// ---------- Schedule metadata ----------

export interface ScheduleMetadata {
  faculty: string;
  program: string;
  course: number;
  module: number;
  period_start: string | null;
  period_end: string | null;
  sheet_name: string;
}

// ---------- Building ----------

export interface Building {
  code: string;
  address: string | null;
}

// ---------- Group metadata ----------

/**
 * Внутренняя модель парсера.
 * В текущем JSON отдельным объектом не возвращается.
 */
export interface ScheduleGroupMetadata {
  name: string;
  program: string;
  faculty: string;
  course: number;
  stream_label: string;
}

// ---------- Date rules ----------

export interface DateRule {
  type: DateRuleType;
  start_date: string | null;
  end_date: string | null;
  dates: string[];
  excluded_dates: string[];
  raw: string | null;
}

// ---------- Time overrides ----------

export interface TimeOverride {
  on_date: string;
  start_time: string;
  end_time: string;
}

// ---------- Lesson ----------

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
}

// ---------- Schedule notes ----------

export interface ScheduleNote {
  group: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  text: string;
  source_cell: string | null;
}

/**
 * В JSON заметка находится внутри свойства note.
 */
export interface ScheduleNoteEntry {
  note: ScheduleNote;
}

export type ScheduleEntry = Lesson | ScheduleNoteEntry;

// ---------- Schedule groups and weekdays ----------

export type ScheduleDay = Partial<Record<DayOfWeek, ScheduleEntry[]>>;

export type ScheduleGroups = Record<string, ScheduleDay>;

// ---------- Parser warnings ----------

export interface ParseWarning {
  severity: WarningSeverity;
  message: string;
  location: string | null;
  raw_value: string | null;
}

// ---------- Parsed schedule ----------

/**
 * Расписание одного листа Excel / Google Sheets.
 */
export interface ParsedSchedule {
  source: ScheduleMetadata;
  buildings: Record<string, Building>;
  groups: ScheduleGroups;
  warnings: ParseWarning[];
}

/**
 * Полный результат парсера.
 * Ключ — название листа, значение — его расписание.
 */
export type ScheduleResponse = Record<string, ParsedSchedule>;
