# `hooks/` — cross-cutting hooks

Per Frontend Constitution §15, cross-cutting hooks not owned by a single
module (`useAuth`, `useSocket`, `useWebRTC`, `useTransactions`,
`useNotifications`, per the Architecture Foundation §15 tree) live here.
Module-owned hooks may instead be co-located inside their own
`components/features/<module>/` folder — each module picks one location
and is internally consistent about it (FE-CON §15).

This foundation module (`FE-01`) intentionally ships none of the named
hooks above, since each requires business logic from an explicitly
out-of-scope domain module:

| Hook | Owning module | Master Plan ID |
|---|---|---|
| `useAuth` | `auth` | `FE-01` (Auth UI) |
| `useSocket` | connection wiring lives in `lib/socket.ts` (this foundation); a `useSocket` hook exposing it to components is added once a module needs it |
| `useWebRTC` | `calling` | `FE-09` |
| `useTransactions` | `transactions` | `FE-06` |
| `useNotifications` | `notifications` | `FE-07` |

Naming convention for any hook added here or in a feature folder:
`camelCase.ts`, always prefixed `use`, returning a named object rather
than a bare tuple (FE-CON §15).
