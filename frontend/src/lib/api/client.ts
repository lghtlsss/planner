import { getSession } from "../session";
import { ApiError, type ApiErrorResponse } from "./errors";
import { handleLocalRequest, LOCAL_SESSION } from "./local";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
  accessToken?: string;
}

function setBodyContentType(
  headers: Headers,
  body: BodyInit | null | undefined,
): void {
  if (body == null || headers.has("Content-Type")) return;

  if (body instanceof URLSearchParams) {
    headers.set(
      "Content-Type",
      "application/x-www-form-urlencoded;charset=UTF-8",
    );
  } else if (
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    headers.set("Content-Type", "application/json");
  }
}

async function parseError(
  response: Response,
  invalidatesSession: boolean,
): Promise<ApiError> {
  let payload: ApiErrorResponse | undefined;

  payload = (await response.json()) as ApiErrorResponse;

  const detail = payload?.detail;
  if (typeof detail === "string") {
    return new ApiError(response.status, detail, detail, invalidatesSession);
  }

  if (Array.isArray(detail)) {
    const message = detail.find((item) => typeof item.msg === "string")?.msg;
    return new ApiError(
      response.status,
      message ?? "Ошибка валидации запроса",
      detail,
      invalidatesSession,
    );
  }

  return new ApiError(
    response.status,
    payload?.message ?? response.statusText ?? "Ошибка API",
    payload,
    invalidatesSession,
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, headers: requestHeaders, ...requestOptions } = options;

  const token = auth ? getSession() : undefined;
  if (token === LOCAL_SESSION) {
    return handleLocalRequest<T>(path, requestOptions);
  }

  const headers = new Headers(requestHeaders);

  setBodyContentType(headers, requestOptions.body);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...requestOptions,
      headers,
    });
  } catch {
    return handleLocalRequest<T>(path, requestOptions);
  }

  if (!response.ok) {
    const invalidatesSession =
      auth &&
      token != null &&
      response.status === 401 &&
      getSession() === token;
    throw await parseError(response, invalidatesSession);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
