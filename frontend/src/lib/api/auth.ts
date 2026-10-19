import { setSession } from "../session";
import { localLogin, localRegister } from "./local";
import type { LoginRequest, RegisterRequest, User } from "./types";

export async function register(data: RegisterRequest): Promise<User> {
  return localRegister(JSON.stringify(data));
}

export async function login(_data: LoginRequest): Promise<string> {
  const tokens = localLogin();
  setSession(tokens.access_token);
  return tokens.access_token;
}
