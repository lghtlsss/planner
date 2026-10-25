export type Difficulty = "easy" | "medium" | "hard" | "very_hard";

// ---------- Auth & User ----------

export interface User {
  name: string | null;
  email: string;
  group_id: number | null;
  sleep_time_hours: number | null;
  go_to_sleep_time: string | null;
  wake_up_time: string | number | null;
  profile_completed: boolean;
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
}

export interface RegisterResponse {
  user: User;
  token: TokenResponse;
}

export interface UpdateUserRequest {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  group_id?: number | null;
  sleep_time_hours?: number | null;
  go_to_sleep_time?: string | null;
  wake_up_time?: string | number | null;
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
  title: string;
  days: DayOfWeek[];
  start_time: string;
  end_time: string;
}

export interface CreateRoutineRequest {
  title: string;
  days: DayOfWeek[];
  start_time: string;
  end_time: string;
}

export interface UpdateRoutineRequest {
  title?: string | null;
  days?: DayOfWeek[] | null;
  start_time?: string | null;
  end_time?: string | null;
}

// ---------- Events (/events — разовые задачи без дедлайна) ----------

export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
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
  name?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_date?: string | null;
}

// ---------- Tasks (/tasks — задачи на день из дедлайнов) ----------

export interface Task {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  potential_end_time: string;
  task_date: string;
  deadline_id: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  start_time: string;
  potential_end_time: string;
  task_date: string;
  deadline_id: number;
}

export interface UpdateTaskRequest {
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  potential_end_time?: string | null;
  task_date?: string | null;
  deadline_id?: number | null;
}

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
  title?: string | null;
  description?: string | null;
  expire_date?: string | null;
  repeat?: boolean | null;
  difficulty?: Difficulty | null;
  tag?: string | null;
  comment?: string | null;
  send_notification?: boolean | null;
  completed?: boolean | null;
  completed_at?: string | null;
}

export interface MessageResponse {
  message?: string;
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
