import { apiRequest } from "./client";
import { clearSession, setSession } from "../session";
import type {
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  TokenResponse,
} from "./types";

export async function register(
  data: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      email: data.email,
      password: data.password,
    }),
  });

  if (response.token?.access_token) {
    setSession(response.token.access_token);
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
