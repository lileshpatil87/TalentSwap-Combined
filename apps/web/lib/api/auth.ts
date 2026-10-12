import type { AuthSessionResponse } from "@talentswap/types";
import { apiRequest } from "@/lib/api";
import type { LoginInput, RegisterInput } from "@talentswap/validation";

export type AuthLoginInput = LoginInput;
export type AuthRegisterInput = RegisterInput;
export type ForgotPasswordInput = { email: string };
export type ResetPasswordInput = { token: string; password: string };

export const authApi = {
  login: (body: AuthLoginInput) => apiRequest<AuthSessionResponse>("/auth/login", { method: "POST", body }),
  register: (body: AuthRegisterInput) => apiRequest<AuthSessionResponse>("/auth/register", { method: "POST", body }),
  forgotPassword: (body: ForgotPasswordInput) => apiRequest<{ message: string }>("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body: ResetPasswordInput) => apiRequest<{ message: string }>("/auth/reset-password", { method: "POST", body }),
  refresh: () => apiRequest<AuthSessionResponse>("/auth/refresh", { method: "POST" }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
};
