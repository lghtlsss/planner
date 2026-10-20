import { apiRequest } from "./client";
import { clearSession, setSession } from "../session";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from "./types";

export async function register(
  data: RegisterRequest,
): Promise<TokenResponse | User> {
  const response = await apiRequest<TokenResponse | User>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(data),
  });

  if ("access_token" in response && response.access_token) {
    setSession(response.access_token);
  }

  return response;
}

export async function login(_data: LoginRequest): Promise<string> {
  const tokens = localLogin();
  setSession(tokens.access_token);
  return tokens.access_token;
}

export function logout(): void {
  clearSession();
}

export function logout(): void {
  clearSession();
}
