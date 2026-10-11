# `store/` — Zustand stores

Holds **only** global ephemeral UI state with no server source of truth
(Frontend Constitution §21.1). If a value ever came from `GET
/api/v1/*`, it belongs in TanStack Query (via a module's own
`hooks/use<Module>.ts`), never here — not even "temporarily."

`uiStore.ts` in this folder is the one store this foundation module
ships: genuinely global, client-only chrome state (sidebar collapsed/
expanded) with no single owning feature module.

The following stores are named in the Architecture Foundation §15 tree
but are **not** created here, since each requires logic owned by an
explicitly out-of-scope domain module:

| Store | Owning module | Master Plan ID |
|---|---|---|
| `authStore.ts` | `auth` — decoded-JWT claims mirror for UI gating | `FE-01` (Auth UI) |
| `notificationStore.ts` | `notifications` — unread badge count | `FE-07` |
| `callStore.ts` | `calling` — active WebRTC call state | `FE-09` |

Each is added by its owning module's own PR, following the same
`camelCase` + `Store` suffix convention and named-export pattern as
`uiStore.ts` (FE-CON §12/§19).
