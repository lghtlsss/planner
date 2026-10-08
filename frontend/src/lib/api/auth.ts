import { apiRequest } from "./client";
import { setAccessToken, removeAccessToken } from "./token-storage";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from "./types";

export async function register(data: RegisterRequest): Promise<User> {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(data),
  });
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const body = new URLSearchParams();

  body.set("username", data.email);
  body.set("password", data.password);

  const response = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body,
  });

  setAccessToken(response.access_token);

  return response;
}

export function logout(): void {
  removeAccessToken();
}
