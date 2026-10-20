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
  } else {
    await login({ email: data.email, password: data.password });
  }

  return response;
}

export async function login(data: LoginRequest): Promise<string> {
  const form = new URLSearchParams({
    username: data.email,
    password: data.password,
  });

  const tokens = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: form,
  });

  const session: string = tokens.access_token;

  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}
