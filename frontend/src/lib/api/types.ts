export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

// ---------- Auth & User ----------

export interface User {
  name: string;
  surname?: string | null;
  email: string;
  group_id: number | null;
  sleepTimeHours: number | null;
  goToSleepTime: string | null;
  wakeUpTime: string | null;
  is_profile_completed?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  surname?: string;
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
  group_id?: number | null;
  goToSleepTime?: string | null;
  wakeUpTime?: string | null;
  sleepTimeHours?: number | null;
}

// ---------- Routines (/routines) ----------

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

// ---------- Events (/events) ----------

export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  event_date: string;
  deadline_id?: number | null;
  comment?: string | null;
  expire_date?: string | null;
  completed?: boolean;
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

export type UpdateEventResponse = CreateEventResponse;

// ---------- Deadlines (/deadlines) ----------

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
  completed?: boolean;
  completed_at?: string | null;
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

// ---------- Catalog & Schedule (/faculties, /programs, /groups, /schedule, /sources) ----------

export interface FacultyOut {
  id: number;
  name: string;
}

export interface ProgramLinkOut {
  state: "ok" | "expiring" | "needs_new_link" | string;
  needs_new_link: boolean;
  expiring_soon: boolean;
  days_left?: number | null;
  period_end?: string | null;
  module?: number | null;
  source_id?: number | null;
}

export interface ProgramOut {
  id: number;
  faculty_id: number;
  faculty: string;
  degree: string;
  name: string;
  label: string;
  link: ProgramLinkOut;
}

export interface ProgramStatusOut extends ProgramLinkOut {
  program_id: number;
  faculty: string;
  program: string;
}

export interface GroupOut {
  id: number;
  name: string;
  course: number;
  stream_label?: string | null;
  program_id: number;
  program: string;
  faculty_id: number;
  faculty: string;
}

export interface GetGroupsParams {
  program_id?: number | null;
  faculty_id?: number | null;
  course?: number | null;
  q?: string | null;
  include_inactive?: boolean;
  limit?: number;
}

export interface LessonOut {
  start_time: string;
  end_time: string;
  subject?: string | null;
  lesson_type?: string | null;
  teacher?: string | null;
  room?: string | null;
  building?: string | null;
  building_address?: string | null;
  online?: boolean;
  stream_group?: string | null;
  subgroup?: string | null;
  is_approximate?: boolean;
  is_changed?: boolean;
}

export interface NoteOut {
  start_time: string;
  end_time: string;
  text: string;
}

export interface DayOut {
  date: string;
  weekday: number;
  weekday_short: string;
  lessons: LessonOut[];
  notes: NoteOut[];
}

export interface ScheduleMetaOut {
  stream_groups_available: string[];
  subgroups_available: string[];
  has_approximate: boolean;
}

export interface ScheduleOut {
  group: GroupOut;
  date_from: string;
  date_to: string;
  days: DayOut[];
  meta: ScheduleMetaOut;
  has_unread_changes?: boolean;
  changed_count?: number;
}

export interface GetScheduleParams {
  group_id: number;
  date_from?: string | null;
  date_to?: string | null;
  subgroup?: string | null;
  stream_groups?: string[] | null;
}

export interface AddSourceIn {
  url: string;
  faculty?: string | null;
  program?: string | null;
}

export interface AddSourceOut {
  ok: boolean;
  message: string;
  source_id?: number | null;
  program_id?: number | null;
  faculty?: string | null;
  program?: string | null;
  module?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  groups?: number;
  lessons?: number;
  already_exists?: boolean;
  errors?: string[];
}
