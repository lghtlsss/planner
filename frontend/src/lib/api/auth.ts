import { setSession } from "../session";
import { localLogin, localRegister, LOCAL_SESSION } from "./local";
import type { LoginRequest, RegisterRequest, User } from "./types";

export async function register(data: RegisterRequest): Promise<User> {
  const user = localRegister(JSON.stringify({ ...data, name: data.name || "" }));
  localStorage.setItem("planner_demo_seeded", "1");
  localStorage.setItem("planner_onboarded", "0");
  setSession(LOCAL_SESSION);
  return user;
}

export async function login(_data: LoginRequest): Promise<string> {
  const tokens = localLogin();
  setSession(tokens.access_token);
  return tokens.access_token;
}
