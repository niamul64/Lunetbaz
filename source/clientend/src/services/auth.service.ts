import { api } from "@/lib/api/client";
import type { AuthSession, DemoAccount, SessionUser } from "@/types";

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
}

export const authService = {
  login: (input: LoginInput) => api.post<AuthSession>("/auth/login", input),
  register: (input: RegisterInput) => api.post<AuthSession>("/auth/register", input),
  logout: () => api.post<{ ok: boolean }>("/auth/logout"),
  me: () => api.get<SessionUser>("/auth/me"),
  /** Mock mode only – lists the seeded demo accounts for the login screen. */
  demoAccounts: () => api.get<DemoAccount[]>("/auth/demo-accounts"),
};
