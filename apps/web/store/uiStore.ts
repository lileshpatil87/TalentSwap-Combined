import { create } from "zustand";

/**
 * Global ephemeral UI state with no server source of truth and no single
 * owning feature module (Frontend Constitution §21.1) — e.g. dashboard
 * chrome state that outlives any one route.
 *
 * This store holds ONLY client-only, derived UI state. It never mirrors
 * server data (FE-CON §21.1) — a value that ever came from `GET
 * /api/v1/*` belongs in TanStack Query, not here, even temporarily.
 *
 * `authStore.ts`, `notificationStore.ts`, and `callStore.ts` (named in
 * the Architecture Foundation §15 tree) are intentionally NOT created in
 * this foundation module — they require business logic from the
 * explicitly out-of-scope `auth`, `notifications`, and `calling`
 * modules, and are added by those modules' own FE-01/FE-07/FE-09 PRs.
 */
interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
}));
