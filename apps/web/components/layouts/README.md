# `components/layouts/`

App-shell chrome only (Frontend Constitution §9) — composed exclusively
inside the `(dashboard)` and `(admin)` route-group layouts.

## Status

Built by **FE-02 — Application Layout & Navigation Foundation**. Per the
Master Development Plan (§3.5), this scope corresponds to `FE-16`
("Dashboard Shell & Navigation") — see
[`../../../docs/frontend/FE-02-delivery-notes.md`](../../../docs/frontend/FE-02-delivery-notes.md)
§3 for the module-ID note (the same kind of flag `FE-01`'s own delivery
notes raised for its scope).

| File | Purpose |
|---|---|
| `Sidebar.tsx` | Desktop primary navigation, collapsible. Prop-driven (`items`/`homeHref`/`backHref`) so `(admin)` reuses it instead of a parallel component. |
| `Navbar.tsx` | Sticky top bar: mobile nav trigger, theme toggle, account menu, route-change focus management. |
| `Footer.tsx` | Minimal shell footer. |
| `MobileNav.tsx` | Sheet-based mobile drawer, mirrors `Sidebar`'s tree below the `lg` breakpoint. |
| `UserNav.tsx` | Account menu placeholder — no real session yet (Auth module's job). |

`MobileNav.tsx` and `UserNav.tsx` were not in the trio this README
originally reserved (`Sidebar`/`Navbar`/`Footer`, matching Architecture
Foundation §15's literal file list). Both are still app-shell chrome, not
feature UI: `MobileNav` is `Navbar`'s own mobile-breakpoint navigation
surface, and `UserNav` is the top bar's account-menu slot. This extension
is documented, not silent — see delivery notes §3.

## What's intentionally still a placeholder

Request-time auth/role enforcement is **not** implemented anywhere in
this folder — `Sidebar`/`Navbar` render the *authenticated shell's*
chrome, but nothing here checks whether the visitor is actually
authenticated or holds the `Moderator`/`Admin` role `(admin)` requires.
That check belongs in `middleware.ts` (Architecture §15 tree), which is
intentionally not shipped by this module either — see delivery notes §1
for why building it now (before a real Auth module exists) would do more
harm than good.
