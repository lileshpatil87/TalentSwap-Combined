"use client";

import { create } from "zustand";
import { Role, type AuthenticatedUser } from "@talentswap/types";
import { authApi, type AuthLoginInput, type AuthRegisterInput } from "@/lib/api/auth";
import { configureApiAuth, NetworkError } from "@/lib/api";
import { isNetworkFallbackEnabled } from "@/lib/api/mode";

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setSession: (user: AuthenticatedUser, token: string) => void;
  clearSession: () => void;
  hydrate: () => Promise<void>;
  login: (input: AuthLoginInput) => Promise<void>;
  register: (input: AuthRegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

function persistUser(user: AuthenticatedUser | null) {
  if (typeof window === "undefined") return;
  if (user) sessionStorage.setItem("ts-session-user", JSON.stringify(user));
  else sessionStorage.removeItem("ts-session-user");
}

function demoUserFor(email: string): AuthenticatedUser {
  return {
    id: email.startsWith("admin@") ? "admin-demo" : `demo-${email.toLowerCase()}`,
    email,
    role: email.startsWith("admin@") ? Role.ADMIN : Role.VERIFIED_USER,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setSession: (user, token) => {
    persistUser(user);
    set({ user, accessToken: token, hydrated: true });
  },
  clearSession: () => {
    persistUser(null);
    set({ user: null, accessToken: null, hydrated: true });
  },
  hydrate: async () => {
    if (get().hydrated) return;
    let stored: AuthenticatedUser | null = null;
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("ts-session-user");
      if (raw) {
        try { stored = JSON.parse(raw) as AuthenticatedUser; } catch { sessionStorage.removeItem("ts-session-user"); }
      }
    }
    if (!stored) { set({ hydrated: true }); return; }
    try {
      const session = await authApi.refresh();
      set({ user: session.user, accessToken: session.accessToken, hydrated: true });
      persistUser(session.user);
    } catch (error) {
      if (error instanceof NetworkError && isNetworkFallbackEnabled()) {
        set({ user: stored, accessToken: "demo-token", hydrated: true });
      } else {
        persistUser(null);
        set({ user: null, accessToken: null, hydrated: true });
      }
    }
  },
  login: async (input) => {
    try {
      const session = await authApi.login(input);
      get().setSession(session.user, session.accessToken);
    } catch (error) {
      if (error instanceof NetworkError && isNetworkFallbackEnabled()) {
        get().setSession(demoUserFor(input.email), "demo-token");
        return;
      }
      throw error;
    }
  },
  register: async (input) => {
    try {
      const session = await authApi.register(input);
      get().setSession(session.user, session.accessToken);
    } catch (error) {
      if (error instanceof NetworkError && isNetworkFallbackEnabled()) {
        get().setSession(demoUserFor(input.email), "demo-token");
        return;
      }
      throw error;
    }
  },
  logout: async () => {
    try { await authApi.logout(); } catch { /* local logout must always complete */ }
    get().clearSession();
  },
}));

export function demoAuthenticatedUser(email: string): AuthenticatedUser {
  return demoUserFor(email);
}

configureApiAuth(() => useAuthStore.getState().accessToken);
