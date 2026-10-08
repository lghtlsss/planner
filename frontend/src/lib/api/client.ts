import { ApiError, type ApiErrorResponse } from "./errors";
import { getAccessToken, removeAccessToken } from "./token-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let data: ApiErrorResponse | undefined;

  try {
    data = (await response.json()) as ApiErrorResponse;
  } catch {}

  const detail = data?.detail;

  if (typeof detail === "string") {
    return new ApiError(response.status, detail, detail);
  }

  if (Array.isArray(detail)) {
    const message =
      detail.find((error) => typeof error.msg === "string")?.msg ??
      "Ошибка валидации";

    return new ApiError(response.status, message, detail);
  }

  return new ApiError(
    response.status,
    response.statusText || "Ошибка API",
    data,
  );
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, headers: requestHeaders, ...requestOptions } = options;

  const headers = new Headers(requestHeaders);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !(requestOptions.body instanceof URLSearchParams)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers,
  });

  if (!response.ok) {
    const error = await parseError(response);

    if (error.isUnauthorized) {
      removeAccessToken();
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
