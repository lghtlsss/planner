import { apiRequest } from "./client";
import type {
  AddSourceIn,
  AddSourceOut,
  FacultyOut,
  GetGroupsParams,
  GetScheduleParams,
  GroupOut,
  ProgramOut,
  ProgramStatusOut,
  ScheduleOut,
  User,
} from "./types";

export function getFaculties(includeInactive = false): Promise<FacultyOut[]> {
  const params = includeInactive ? "?include_inactive=true" : "";
  return apiRequest<FacultyOut[]>(`/faculties${params}`);
}

export function getPrograms(params?: {
  faculty_id?: number | null;
  include_inactive?: boolean;
}): Promise<ProgramOut[]> {
  const search = new URLSearchParams();
  if (params?.faculty_id != null) {
    search.set("faculty_id", String(params.faculty_id));
  }
  if (params?.include_inactive) {
    search.set("include_inactive", "true");
  }
  const query = search.toString();
  return apiRequest<ProgramOut[]>(query ? `/programs?${query}` : "/programs");
}

export function getProgramStatus(programId: number): Promise<ProgramStatusOut> {
  return apiRequest<ProgramStatusOut>(`/programs/${programId}/status`);
}

export function getGroups(params?: GetGroupsParams): Promise<GroupOut[]> {
  const search = new URLSearchParams();
  if (params?.program_id != null) {
    search.set("program_id", String(params.program_id));
  }
  if (params?.faculty_id != null) {
    search.set("faculty_id", String(params.faculty_id));
  }
  if (params?.course != null) {
    search.set("course", String(params.course));
  }
  if (params?.q) {
    search.set("q", params.q);
  }
  if (params?.include_inactive) {
    search.set("include_inactive", "true");
  }
  if (params?.limit != null) {
    search.set("limit", String(params.limit));
  }
  const query = search.toString();
  return apiRequest<GroupOut[]>(query ? `/groups?${query}` : "/groups");
}

export function getSchedule(params: GetScheduleParams): Promise<ScheduleOut> {
  const search = new URLSearchParams({
    group_id: String(params.group_id),
  });
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.subgroup) search.set("subgroup", params.subgroup);
  if (params.stream_groups) {
    for (const sg of params.stream_groups) {
      search.append("stream_groups", sg);
    }
  }
  return apiRequest<ScheduleOut>(`/schedule?${search.toString()}`);
}

export async function getScheduleForUser(
  user: Pick<User, "group_id"> | null | undefined,
  options?: {
    date_from?: string | null;
    date_to?: string | null;
    subgroup?: string | null;
    stream_groups?: string[] | null;
  },
): Promise<ScheduleOut | null> {
  if (user?.group_id == null) return null;
  return getSchedule({
    group_id: user.group_id,
    ...options,
  });
}

export function createScheduleSource(
  data: AddSourceIn,
  adminToken?: string,
): Promise<AddSourceOut> {
  const headers: Record<string, string> = {};
  if (adminToken) {
    headers["x-admin-token"] = adminToken;
  }
  return apiRequest<AddSourceOut>("/sources", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
}
