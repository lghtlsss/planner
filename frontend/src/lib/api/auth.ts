import { apiRequest } from "./client";
import { setSession } from "./session";
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
