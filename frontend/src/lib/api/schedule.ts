import { apiRequest } from "./client";
import type {
  MessageResponse,
  UploadScheduleByUrlRequest,
  UserScheduleResponse,
} from "./types";

export function getSchedule(): Promise<UserScheduleResponse> {
  return apiRequest<UserScheduleResponse>("/schedule");
}

export function uploadScheduleFile(
  file: File,
  group?: string,
): Promise<UserScheduleResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (group) {
    formData.append("group", group);
  }

  return apiRequest<UserScheduleResponse>("/schedule/upload", {
    method: "POST",
    body: formData,
  });
}

export function uploadScheduleUrl(
  data: UploadScheduleByUrlRequest,
): Promise<UserScheduleResponse> {
  return apiRequest<UserScheduleResponse>("/schedule/by-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function markScheduleChangesSeen(): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/schedule/mark-seen", {
    method: "POST",
  });
}
