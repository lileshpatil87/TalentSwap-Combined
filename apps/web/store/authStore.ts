"use client";

import { create } from "zustand";
import type { AuthenticatedUser } from "@talentswap/types";
import { authApi, type AuthLoginInput, type AuthRegisterInput } from "@/lib/api/auth";
import { configureApiAuth } from "@/lib/api";

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



export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  setSession: (user, token) => {
    const previousUser = get().user;
    set({ user, accessToken: token, hydrated: true });
    if ((previousUser?.id !== user.id || previousUser?.role !== user.role) && typeof window !== "undefined") {
      window.dispatchEvent(new Event("talentswap:auth-changed"));
    }
  },
  clearSession: () => {
    const hadSession = Boolean(get().user || get().accessToken);
    set({ user: null, accessToken: null, hydrated: true });
    if (hadSession && typeof window !== "undefined") {
      window.dispatchEvent(new Event("talentswap:auth-changed"));
    }
  },
  hydrate: async () => {
    if (get().hydrated) return;
    // The httpOnly refresh cookie is authoritative. Do not require a cached
    // user object to attempt refresh, and never resurrect a demo identity.
    try {
      const session = await authApi.refresh();
      set({ user: session.user, accessToken: session.accessToken, hydrated: true });
    } catch {
      set({ user: null, accessToken: null, hydrated: true });
    }
  },
  login: async (input) => {
    const session = await authApi.login(input);
    get().setSession(session.user, session.accessToken);
  },
  register: async (input) => {
    const session = await authApi.register(input);
    get().setSession(session.user, session.accessToken);
  },
  logout: async () => {
    try { await authApi.logout(); } catch { /* local logout must always complete */ }
    get().clearSession();
  },
}));


configureApiAuth(
  () => useAuthStore.getState().accessToken,
  (session) => useAuthStore.getState().setSession(session.user, session.accessToken),
  () => useAuthStore.getState().clearSession(),
);
