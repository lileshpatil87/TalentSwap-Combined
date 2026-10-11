# TalentSwap — Frontend Constitution

| | |
|---|---|
| **Document ID** | FE-CON-v1.0 |
| **Document Type** | Frontend Engineering Standards (Domain Constitution) |
| **Author / Role** | John — Frontend Architect (Account 02) |
| **Authority** | Frontend Constitution, Shared UI, Frontend Reviews, Frontend Modules (AI SDLC §3.3). This document does **not** redesign architecture, does **not** change the technology stack, and does **not** introduce new frameworks without explicit justification. |
| **Governing Documents (priority order)** | 1. `TalentSwap_Architecture_Foundation.md` v1.1 (PRIMARY AUTHORITY) · 2. `TalentSwap_Master_Development_Plan.md` · 3. `TalentSwap Specification.md` · 4. `TalentSwap Proposal.md` |
| **Status** | 🔒 **Frozen** — v1.0 ratified by Erwin (Lead Architect), 2026-08-04, per AI SDLC §3.1 / Architecture Foundation §7.4. This is now binding on every future `FE-xx` module session. |
| **Change Control** | Amendable only via AI SDLC §1 Governance Rules (explicit approval, critical architectural issue, or a formal ADR). Any conflict between this document and the Architecture Foundation is resolved in the Architecture Foundation's favor. |

> **Scope statement:** This document defines *standards*, not *implementation*. It contains no page code, no component code, no hooks, no API routes, and no layouts. Every future frontend module (`FE-01` … `FE-16`, per the Master Development Plan §3.5) is built against this document. Where this document is silent, the Architecture Foundation governs; where the Architecture Foundation is silent, this document fills the gap specifically for `apps/web`, using the same reasoning discipline the Architecture Foundation itself uses in its own §0.

---

## Executive Summary

TalentSwap's frontend is a single Next.js 14 App Router application (`apps/web`) inside the TalentSwap pnpm/Turborepo monorepo, serving both public SEO-relevant pages and an authenticated, real-time dashboard experience for a financial-grade, points-based skill exchange platform. Sixteen frontend modules (Auth, Profile, Skills, Discover, Wallet, Transactions, Notifications, Chat, Calling, Gamification, Documents, Community, Ratings, Admin, Public Pages, Dashboard Shell) will be built by independent AI or human engineering sessions over the project's lifetime, per the Master Development Plan's roadmap. Because no single person or session holds the whole codebase in their head at once, consistency has to be engineered into the *process*, not hoped for after the fact.

This Constitution is that engineering. It fixes, once and permanently (barring an ADR), how folders are organized, how modules are bounded, how state is categorized and where it lives, how components and hooks and types are named, how forms and validation work, how loading/empty/error states are built, how design tokens flow from `packages/ui-tokens` into Tailwind into components, how accessibility and performance are enforced rather than aspired to, and what "done" means for a frontend module. It does not choose the stack — the stack (Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Framer Motion, Lucide Icons) is locked by the Technology Specification and restated, not reopened, here. It also does not choose business logic, copy, or visual branding — those belong to the module doing the building, operating inside the boundaries this document draws.

Any frontend engineer — human or AI, today or eighteen months from now — should be able to read this document once, read the Architecture Foundation's Section 15 tree and Section 3.2 module table, and then build any of the sixteen frontend modules without needing to look at any other module's code to know where their files go, what to name them, or how they're allowed to talk to the rest of the system.

---

## Table of Contents

1. Frontend Architecture Philosophy
2. Frontend Folder Structure
3. Feature-Based Organization
4. Shared Packages Strategy
5. App Router Structure
6. Route Groups
7. Layout Architecture
8. Page Organization
9. Shared Component Organization
10. UI Component Standards
11. Naming Conventions (Overview)
12. File Naming Rules
13. Folder Naming Rules
14. Component Naming Rules
15. Hook Naming Rules
16. Utility Naming Rules
17. Type Naming Rules
18. Import Order Rules
19. Export Rules
20. Path Alias Strategy
21. State Management Rules
22. Form Standards
23. Validation Standards
24. Error Handling Standards
25. Loading State Standards
26. Skeleton Standards
27. Empty State Standards
28. Responsive Design Standards
29. Breakpoint Strategy
30. Theme Architecture
31. Design Token Strategy
32. Color System
33. Typography System
34. Spacing System
35. Border Radius Standards
36. Elevation & Shadow Standards
37. Icon Usage Standards
38. Animation Standards
39. Accessibility Standards
40. Keyboard Navigation Standards
41. Screen Reader Standards
42. Dark Mode Strategy
43. Performance Standards
44. Code Splitting Strategy
45. Lazy Loading Strategy
46. Dynamic Import Standards
47. Image Optimization Strategy
48. Frontend Security Best Practices
49. Environment Variable Usage (Frontend)
50. API Client Organization
51. Error Boundary Strategy
52. Logging Standards (Frontend)
53. Testing Standards
54. Documentation Standards
55. Frontend Review Guidelines
56. Definition of Done for Frontend Modules
57. Future Frontend Module Development Rules

Appendix A — Change Log
Appendix B — Glossary

---

## 1. Frontend Architecture Philosophy

1. **One frontend, hybrid rendering, single deployable unit.** `apps/web` is a Next.js 14 App Router monolith — SSR/SSG for public, SEO-relevant pages; CSR + TanStack Query for the authenticated dashboard (Arch §1.2). There is no separate marketing site, no separate admin SPA, no micro-frontend split. A second frontend app is architecturally out of scope unless an ADR says otherwise.
2. **Modules mirror the backend, one-to-one.** Every frontend module corresponds to exactly one backend domain module (Arch §3.2). A contributor who understands the backend `wallet` module's boundary already understands the frontend `wallet` module's boundary. This mirroring is not a convenience — it is load-bearing for the whole multi-session development model in the Master Development Plan.
3. **The backend is the source of truth; the frontend is a rendering and interaction layer over it.** No business rule (XP formulas, escrow rules, match-ranking weights) is ever computed, duplicated, or "helpfully" re-derived in the frontend. If a number needs a formula, that formula lives in a backend service and the frontend displays what the API returns.
4. **Boundaries are enforced, not requested.** Module boundaries (Section 3 below), the communication rules (Arch §4.1), and the state-ownership rules (Section 21 below) are treated exactly like the backend's `check-boundaries.ts` gate — a PR that crosses them is a "request changes," not a style nit (Arch §7.4).
5. **Consistency over local optimization.** A module-building session must not invent a "better" pattern for its module in isolation. If this document's pattern genuinely does not fit a new module's needs, that is a signal to raise it with Erwin/John for a possible ADR — not to quietly diverge (Arch §17.5).
6. **Server state and client state are never the same state.** This is the single most consequential rule in this document (expanded in Section 21) and exists because TalentSwap is a financial-grade ledger platform (Arch §6.1) where a stale or duplicated client-side copy of a balance, an escrow status, or a confirmation flag is not a cosmetic bug — it's a trust failure.
7. **Accessibility and performance are standards, not stretch goals.** WCAG 2.1 AA (Arch §11.4) and the performance budget in Section 43 apply to every module from its first PR, not retrofitted before launch.

---

## 2. Frontend Folder Structure

The complete `apps/web` tree is fixed by Architecture Foundation §15 and is restated here as the frontend-facing reference. No top-level folder inside `apps/web` may be added without amending the Architecture Foundation.

```text
apps/web/
├── app/                     # Next.js App Router — see Sections 5–8
│   ├── (public)/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── (admin)/
│   ├── layout.tsx
│   ├── globals.css
│   └── not-found.tsx
├── components/
│   ├── ui/                  # shadcn/ui primitives — generic, zero feature imports
│   ├── features/<module>/   # one folder per frontend module — see Section 3
│   └── layouts/             # Sidebar.tsx, Navbar.tsx, Footer.tsx — app-shell chrome only
├── hooks/                   # cross-cutting hooks (useAuth, useSocket, useWebRTC…)
├── lib/
│   ├── api.ts                # the ONE configured fetch wrapper + parseApiError
│   ├── api/<module>.ts       # per-module API client slices
│   ├── socket.ts              # the ONE Socket.io client singleton
│   ├── env.ts                  # validated public env (Section 49)
│   └── utils.ts
├── store/                   # Zustand stores — see Section 21
├── types/                   # app-LOCAL types only (cross-app types → packages/types)
├── public/
├── middleware.ts            # auth-gating middleware
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json             # extends ../../tsconfig.base.json
├── .env.example
├── Dockerfile
└── package.json
```

Rules:
- Feature files inside `components/features/<module>/` are created empty (barrel file only) until that module's dedicated build task begins, per the Roadmap sequencing in Arch §16.
- No frontend module may create a top-level folder inside `apps/web` outside this tree.
- `types/` at the app root holds only types that are genuinely local to `apps/web` and never crossed into `apps/api` — if a type describes an API request/response shape, it belongs in `@talentswap/types`, not here (Section 4).

---

## 3. Feature-Based Organization

TalentSwap's frontend is organized by **domain feature**, never by technical layer (there is no global `components/forms/`, `components/cards/`, or `components/modals/` graveyard). The fourteen domain frontend modules are exactly (Arch §3.2, Master Plan §3.5):

`auth`, `profile`, `skills`, `discover`, `wallet`, `transactions`, `gamification`, `documents`, `chat`, `calling`, `notifications`, `community`, `ratings`, `admin`

— plus two structural, non-domain modules: `public-pages` (SEO/marketing surface, `FE-15`) and `dashboard-shell` (app chrome/navigation, `FE-16`).

Each domain module owns, and owns exclusively:

| Owns | Location |
|---|---|
| Its route segment(s) | `app/(dashboard)/<module>/…` (or `(public)`/`(admin)` as applicable) |
| Its feature components | `components/features/<module>/` |
| Its TanStack Query hooks | `hooks/use<Module>.ts` or co-located inside the feature folder |
| Its API client slice | `lib/api/<module>.ts` |
| Its Zustand slice (if any client-only state is genuinely needed) | `store/<module>Store.ts` |

A module may **not** reach into another module's `components/features/<other-module>/` folder and import an internal component directly — e.g., `transactions` importing `wallet`'s internal `BalanceCard` implementation is forbidden (Arch §3.2). If a piece of UI is genuinely needed by two or more modules, it is promoted to `components/ui/` as a generic primitive with no feature-specific naming or behavior — it is never cross-imported from a sibling feature folder.

Every feature folder ends with a barrel `index.ts` exporting only the components meant to be consumed by that module's own routes/layouts. Nothing inside a feature folder is imported by path from outside that folder.

---

## 4. Shared Packages Strategy

`apps/web` consumes, but never modifies in place, the following workspace packages (Arch §2.3):

| Package | What `apps/web` gets from it |
|---|---|
| `packages/types` | Every DTO/API response/request shape shared with `apps/api`. This is the **only** legal way `apps/web` and `apps/api` agree on a data shape — hand-duplicating a DTO in `apps/web/types/` is a Constitution violation. |
| `packages/validation` | Every Zod schema used by a React Hook Form resolver (Section 22–23). The same schema instance the backend uses in its `ZodValidationPipe` — never a frontend-local re-implementation. |
| `packages/utils` | Pure formatting/date/pagination helpers shared with the backend. |
| `packages/ui-tokens` | Raw design-token values (color, spacing, typography scale) consumed by `tailwind.config.ts`'s theme extension (Section 31). |
| `packages/config` | Base ESLint/Prettier/tsconfig, extended (never overridden) by `apps/web`. |

Rules:
- `apps/web` never depends on anything inside `apps/api`, directly or transitively (Arch §2.3, one-way dependency direction).
- If a module needs a new shared type or validation schema, it is added to `packages/types`/`packages/validation` **first**, as part of that module's own PR, with a Changesets entry for the semver bump (Arch §7.5) — not deferred, not inlined locally "for now."
- A frontend module never imports another package's internal file path — only the package's barrel export (`@talentswap/types`, not `@talentswap/types/src/user.types`).

---

## 5. App Router Structure

- The App Router (`apps/web/app/`) is the only routing mechanism. No `pages/` directory exists anywhere in the repository.
- Every route segment maps 1:1 to a URL path per Next.js App Router conventions; route group folders (parenthesized) organize routes without affecting the URL (Section 6).
- Server Components are the default for any route/page that does not require interactivity, browser APIs, or client-only state. A component is only marked `'use client'` when it genuinely needs `useState`, `useEffect`, event handlers, TanStack Query hooks, Zustand, or a browser API.
- Server Components performing SSR data fetching call the backend through the same versioned `apps/web/lib/api.ts` client and the same `/api/v1/*` endpoints as client-side code (Arch §4.1) — there is no private SSR-only endpoint shortcut, ever.
- Parallel routes and intercepting routes (Spec §2.1.5) are reserved for modal-over-context UX patterns (e.g., viewing a profile card without leaving a search results page) and are only introduced by the module that owns that UX, not retrofitted globally.

---

## 6. Route Groups

Four route groups exist, exactly matching Arch §15, and no fifth may be added without an ADR:

| Route Group | Purpose | Rendering | Auth |
|---|---|---|---|
| `(public)` | Landing, public skill directory, public profile | SSR/SSG | None required |
| `(auth)` | Login, register, forgot/reset password | CSR, minimal layout | Must be logged out (redirect if authenticated) |
| `(dashboard)` | The authenticated application — all fourteen domain modules render here except `admin` | CSR + TanStack Query | Required — enforced by `middleware.ts` |
| `(admin)` | Moderation dashboards, analytics | CSR + TanStack Query | Required + `Moderator`/`Admin` role |

A domain module's routes live inside exactly the route group implied by its nature: `(public)` for `public-pages`, `(dashboard)` for everything a normal authenticated user touches, `(admin)` only for `admin`. No domain module splits its routes across two route groups without a documented reason tied to its own DoD.

---

## 7. Layout Architecture

- `app/layout.tsx` (root) owns only: `<html>`/fonts/global providers (TanStack Query `QueryClientProvider`, theme provider, toaster) and `globals.css`. It contains no route-specific UI.
- Each route group with shared chrome owns its own `layout.tsx` (`(auth)/layout.tsx`, `(dashboard)/layout.tsx`, `(admin)/admin/layout.tsx`). The `(dashboard)` layout is the only place `Sidebar.tsx`, `Navbar.tsx`, and `Footer.tsx` (`components/layouts/`) are composed.
- Layouts render chrome and structural composition only — no data-fetching business logic beyond what's needed for the chrome itself (e.g., unread-notification badge count via a hook), and no module-specific feature logic. A layout is never the place a domain module puts its own feature UI.
- Nested layouts follow the App Router's natural nesting; a domain module adds a layout under its own route segment (e.g., `exchanges/layout.tsx`) only if it needs shared UI across its own sub-routes — this is that module's own decision, scoped to its own folder.
- Every `(dashboard)` and `(admin)` layout is wrapped in a React Error Boundary (Section 51) at the route-group level, so a render-time failure in one module never takes down the whole shell.

---

## 8. Page Organization

- A `page.tsx` file is a thin composition root: it assembles feature components from `components/features/<module>/`, wires up the module's TanStack Query hooks, and returns JSX. It contains no business logic of its own beyond simple presentational conditionals.
- Dynamic route segments (`[id]`, `[conversationId]`, `[postId]`) receive their param, pass it straight to the module's `hooks/use<Module>.ts` query, and render loading/empty/error states per Sections 25–27 — a page never hand-rolls its own fetch.
- A page is a Server Component unless it needs client interactivity itself; more commonly, the page stays a thin Server Component and delegates the interactive parts to a `'use client'` feature component it renders.
- `loading.tsx` and `error.tsx` files (Next.js App Router file conventions) are used at the route-segment level for full-page transitions; component-level loading/empty/error states inside an already-rendered dashboard shell use the shared primitives in Sections 25–27 instead, since the shell itself should not re-suspend on every module navigation.

---

## 9. Shared Component Organization

`components/ui/` holds **only** generic, feature-agnostic primitives — shadcn/ui-derived building blocks (Button, Dialog, Input, Table, Skeleton, Tabs, etc.) plus the platform's own generic composites (`<EmptyState>`, `<ErrorState>`, semantic badge wrappers). Rules:

- Nothing in `components/ui/` imports from `components/features/*`. The dependency direction is one-way: features depend on `ui`, never the reverse.
- A component only earns a place in `components/ui/` if at least two distinct modules need it, or if it's a direct shadcn/ui primitive. A component used by exactly one module lives in that module's `components/features/<module>/` folder until a second module needs it — at which point it is promoted, not copy-pasted.
- `components/ui/` components accept no module-specific props (e.g., no `transactionStatus` prop on a generic `<Badge>` — instead the feature component maps its domain state to the generic component's generic `variant` prop).
- `components/layouts/` is reserved for app-shell chrome (`Sidebar`, `Navbar`, `Footer`) only — it is not a second dumping ground for shared feature UI.

---

## 10. UI Component Standards

- Every interactive UI element is composed from `components/ui/` primitives, which are themselves Radix-based shadcn/ui components (Spec §2.1.3) — a feature module does not reach for a third-party component library or hand-roll a modal/dropdown/date-picker from scratch.
- A component's public props interface is exported alongside the component and named `<ComponentName>Props` (Section 17).
- A component that has no required props (or supplies sensible defaults for all of them) is preferred, consistent with this Constitution's own artifact conventions — this keeps every component independently previewable and testable.
- Presentational components (pure rendering, no data fetching) and container components (fetch via hooks, pass data down) are kept conceptually distinct even when they live in the same file for a small component — a component should not silently mix "I fetch my own data" with "I am reused inside a list with data passed as props."
- A component never reaches into `localStorage`/`sessionStorage` directly (Section 48); persistent client state goes through the backend, and ephemeral client state goes through Zustand or `useState`.
- No component hardcodes a raw hex color, raw pixel spacing, or raw font size (Arch §11) — see Sections 31–36.

---

## 11. Naming Conventions (Overview)

All naming in `apps/web` follows Architecture Foundation §5 exactly; Sections 12–17 below restate and elaborate those rules specifically for frontend engineers, with no deviation. The governing principle: **a filename should tell you what's inside it, and a folder name should tell you what module owns it, without opening the file.**

---

## 12. File Naming Rules

| File type | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx`, matching the component's default export name | `TransactionCard.tsx` |
| React hook | `camelCase.ts`, always prefixed `use` | `useTransactions.ts` |
| Zustand store | `camelCase` + `Store` suffix | `authStore.ts` |
| API client slice | `camelCase.ts`, matches module name exactly | `lib/api/transactions.ts` |
| Utility file | `camelCase.ts`, noun or noun-phrase describing its contents | `pointFormat.ts` |
| Type-only file (app-local) | `camelCase.types.ts` | `dashboard.types.ts` |
| Unit/component test | co-located `<Name>.test.tsx` | `TransactionCard.test.tsx` |
| Barrel file | always exactly `index.ts` | `components/features/wallet/index.ts` |
| Route file | fixed Next.js convention names | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` |

A file never mixes concerns implied by two different rows of this table (e.g., a hook file that also default-exports a component).

---

## 13. Folder Naming Rules

- All folders: `kebab-case`, no exceptions — including feature-module folders (`components/features/skill-listings/` if such granularity is ever needed within a module, though the top-level module folders themselves use the exact single-word names from Section 3).
- Route segment folders are `kebab-case` and become the literal URL segment (`app/(dashboard)/exchanges/[id]/page.tsx` → `/exchanges/:id`), per Arch §5.1.
- A module's folder name in `components/features/` matches its name in the Section 3 module list exactly — no abbreviations, no pluralization drift (`transactions/`, not `transaction/` or `txns/`).
- Route groups use parentheses per Next.js convention (`(public)`, `(dashboard)`) and are not counted as URL segments.

---

## 14. Component Naming Rules

- `PascalCase`, and the component name equals the default export equals the filename (Arch §5.2): `function TransactionCard() {}` in `TransactionCard.tsx`.
- Component names are nouns or noun phrases describing *what it renders*, not *how* (`EscrowStatusBadge`, not `RedYellowGreenIndicator`).
- Compound/variant components use a clear prefix relationship: `TransactionCard`, `TransactionCardSkeleton`, `TransactionCardCompact` — never an unrelated name for a variant of the same concept.
- Generic `components/ui/` primitives use bare, library-style names matching their shadcn/ui origin (`Button`, `Dialog`, `Skeleton`) with no module prefix.
- Feature components never share a bare name with a `components/ui/` primitive (no feature-local `Button.tsx`) — this is what makes import statements unambiguous at a glance.

---

## 15. Hook Naming Rules

- `camelCase`, always prefixed `use`, per Arch §5.1/§5.2.
- Module-level TanStack Query/mutation hooks are named `use<Module>` for the primary hook (`useTransactions`) with more specific hooks named `use<Module><Noun>` for sub-concerns (`useTransactionDetail`, `useWalletBalance`).
- A hook returns a **named object**, not a bare tuple, unless it returns exactly two values with an obvious order matching the React convention (`[value, setValue]`) — per Arch §5.2. `const { data, isLoading, error } = useTransactions()`, not `const [data, isLoading, error] = useTransactions()`.
- Cross-cutting hooks that are not module-owned (`useAuth`, `useSocket`, `useWebRTC`) live in the top-level `hooks/` folder per the Section 2 tree; module-owned hooks may be co-located inside their feature folder or live in `hooks/use<Module>.ts` — a module picks one location and is internally consistent about it.

---

## 16. Utility Naming Rules

- `camelCase`, verb-first for functions performing an action (`formatPoints`, `parseApiError`), noun-first for pure data transformers returning a derived value (`pointsToDisplayString`).
- A utility function's name states intent, not implementation, exactly per Arch §5.2 (`calculateReputationScore()`, not `computeStuff()`).
- Utilities that are genuinely shared across `apps/web` and `apps/api` belong in `@talentswap/utils`, never duplicated locally; utilities specific to frontend rendering concerns (e.g., a Tailwind `className` merge helper) live in `apps/web/lib/utils.ts`.
- No utility function silently swallows an error or returns `null`/`undefined` to mean "something went wrong" — it throws, or returns an explicit `Result`-shaped value the caller must handle (mirrors Arch §10.4's backend rule, applied to frontend-side business-adjacent logic like point/date calculations).

---

## 17. Type Naming Rules

- `PascalCase` for all types, interfaces, and type aliases — no `I` prefix on interfaces (modern convention, matches Arch §5.2 exactly).
- A component's props type is named `<ComponentName>Props` (`TransactionCardProps`) and is co-located in the same file as the component, exported.
- A hook's return type, when complex enough to name explicitly, is named `Use<Hook>Result` (`UseTransactionsResult`).
- Cross-app data-shape types (anything that describes an API request or response body) are **never** defined in `apps/web/types/` — they come from `@talentswap/types` (Section 4). `apps/web/types/` holds only types with no backend counterpart (e.g., a client-only UI state enum).
- Enums mirror Arch §5.2: `PascalCase` type name, `UPPER_SNAKE_CASE` members — and are always imported from `@talentswap/types` when the enum also exists on the backend (e.g., `TransactionStatus`), never redeclared locally.

---

## 18. Import Order Rules

Enforced automatically via `eslint-plugin-import`'s `order` rule, identical four-group structure to the backend (Arch §6.4), applied consistently across every `apps/web` file:

```ts
// 1. Node/external packages
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Workspace packages (aliased)
import { TransactionStatus } from '@talentswap/types';
import { createTransactionSchema } from '@talentswap/validation';

// 3. Internal absolute (this app's alias, @/*)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// 4. Relative (same module folder only, per Section 20)
import { TransactionRow } from './TransactionRow';
```

Each group is separated by exactly one blank line. `pnpm lint --fix` is the single source of truth for import ordering — it is never hand-arranged.

---

## 19. Export Rules

- React components use a **default export**, matching the filename (Section 12/14).
- Everything else — hooks, utilities, types, constants — uses **named exports**. A file never mixes "the component is default, but I also named-export three helper functions from the same file" without those helpers being genuinely private-to-that-component implementation detail; if a helper is reusable, it moves to `lib/utils.ts` or the module's own utils file with its own named export.
- Every module's `components/features/<module>/index.ts` barrel exports only the components meant for consumption by that module's own `page.tsx`/`layout.tsx` files or, rarely, by a route in another route group that legitimately needs it (e.g., a public profile page needing a read-only `profile` card). Internal sub-components not meant for outside use are not re-exported from the barrel, even though — unlike the strictly-enforced backend barrel pattern — Next.js does not mechanically prevent a deep import; the discipline here is enforced by code review (Section 55) and `no-restricted-imports` (Section 20).
- `store/*Store.ts` files export their Zustand hook as a named export matching the filename (`export const useAuthStore = create<AuthState>()(...)`).

---

## 20. Path Alias Strategy

Path aliases are fixed by Architecture Foundation §6.2 and restated here:

| Alias | Resolves to |
|---|---|
| `@/*` | `apps/web/*` |
| `@talentswap/types` | `packages/types/src` |
| `@talentswap/validation` | `packages/validation/src` |
| `@talentswap/utils` | `packages/utils/src` |
| `@talentswap/ui-tokens` | `packages/ui-tokens/src` |

Rules:
- Relative imports (`../../../`) are permitted **only** within a module's own folder tree — e.g., a component in `components/features/wallet/` importing a sibling in the same folder (Arch §6.2).
- Any import that crosses a module boundary — including from one feature folder to another, or from a feature folder up to `components/ui/` or `hooks/` — **must** use the `@/*` alias form, never a relative path that climbs out of the current folder.
- This is enforced by an ESLint `no-restricted-imports` rule plus the shared `scripts/check-boundaries.ts` (Arch §2.6), which is extended to also scan `apps/web` module boundaries, not just `apps/api`'s.
- Deep-importing a non-barrel-exported file from another module (e.g., `import { BalanceCard } from '@/components/features/wallet/BalanceCard'` from inside `transactions`) is forbidden regardless of alias correctness — see Section 3 and Section 19.

---

## 21. State Management Rules

This section is the single most important section in this document. TalentSwap's state model has exactly four categories, and every piece of state in the frontend belongs to exactly one of them (Arch §12):

| Kind of state | Tool | Belongs here because… | Examples |
|---|---|---|---|
| **Server state** — anything that originates from the API and can go stale | **TanStack Query** | It has a source of truth on the backend; the frontend's copy is a cache, not an owner | Skill listings, transaction history, wallet balance, chat history, match suggestions, notifications list |
| **Global ephemeral UI state** — client-only, no server source of truth, needed across distant components | **Zustand** | It's genuinely client-only and would otherwise require prop-drilling through unrelated components | Decoded-JWT claims mirror for UI gating, active WebRTC call state, unread-notification badge count, sidebar collapsed/expanded, active theme |
| **Local component state** | `useState` / `useReducer` | It's scoped to one component tree and dies when that component unmounts | Modal open/closed, dropdown selection before submit, hover/focus flags, tab selection within one component |
| **Form state** | **React Hook Form** (Zod resolver from `@talentswap/validation`) | It has its own well-understood lifecycle (dirty/touched/valid/submitting) that neither Zustand nor `useState` model well | Registration wizard, skill listing editor, transaction confirmation dialog |

### 21.1 What belongs in Zustand

Zustand holds **only** state that (a) has no server source of truth, and (b) needs to be read or written from components that are not directly related in the render tree. If a value came from `GET /api/v1/*` at any point, it does not belong in a Zustand store, even "temporarily" or "for convenience." A Zustand store never holds a copy of `transaction.status`, `wallet.balance`, or any other field that TanStack Query already owns — Zustand may hold a **derived, client-only boolean or enum** computed from that data at the point of use (e.g., `isCallModalOpen`), never the data itself.

### 21.2 What belongs in TanStack Query

Anything fetched from `/api/v1/*` or pushed via a WebSocket event that represents server-originated data. Query keys follow a fixed structure so invalidation is predictable and identical across every module: `[<module>, <resource>, <id?>, <filters?>]` — e.g. `['transactions', 'list', { status: 'escrow_held' }]`, `['transactions', 'detail', transactionId]`. Mutations invalidate the narrowest matching key set, defined once per module inside that module's `hooks/use<Module>.ts`, never ad hoc at the call site inside a component.

WebSocket-pushed events update the TanStack Query cache directly (`queryClient.setQueryData` / `invalidateQueries` inside the socket event handler in `lib/socket.ts` or a module's own socket listener) rather than maintaining a parallel real-time store — there is exactly **one** cache for server-originated data, whether it arrived via REST or WebSocket (Arch §12).

### 21.3 What belongs in local component state

Anything a component would be embarrassed to explain to another component. If nothing outside the current component tree needs to read or react to a value, it is `useState`/`useReducer`, full stop — promoting it to Zustand "just in case" is a Constitution violation, not a harmless precaution, because it re-introduces the exact prop-drilling-avoidance problem Zustand exists to solve while now also creating a second potential source of truth.

### 21.4 Enforcement

Code review (Section 55) explicitly checks for state-category misplacement as a first-class review item, on par with a module-boundary violation — because a duplicated copy of server state that drifts out of sync is functionally indistinguishable, from the user's perspective, from a backend bug on a platform where balances and escrow status are involved.

---

## 22. Form Standards

- Every form in `apps/web` is built with **React Hook Form**, using uncontrolled inputs by default (Spec §2.1.4) — no form hand-rolls its own `useState`-per-field pattern.
- Every form's validation resolver is the Zod schema imported from `@talentswap/validation` — the same schema instance the corresponding backend DTO wraps via `createZodDto()` (Arch §17.2 step 3). A frontend module never authors a parallel, frontend-only validation schema for a field that also exists on the backend.
- Form submission handlers call the module's TanStack Query **mutation** hook (`hooks/use<Module>.ts`), never `lib/api/<module>.ts` functions directly from inside a component — the mutation hook is the single place that knows which queries to invalidate on success (Section 21.2).
- Multi-step forms (registration wizard, transaction confirmation) manage step position as **local component state** (`useReducer` is preferred once there are more than two steps) — not Zustand, since step position has no meaning outside that flow.
- A submit button is disabled while `isSubmitting`/a mutation is `isPending`, and always gives the user visible feedback (Section 24) rather than a silent no-op on double-click.

---

## 23. Validation Standards

- **Single source of truth:** every validation rule lives once, in `packages/validation/src/<module>.schema.ts`, and is consumed by both the React Hook Form resolver on the frontend and the NestJS `ZodValidationPipe` on the backend (Arch §10.3, Spec §2.1.4). A frontend module never writes `z.object({...})` inline inside a component for a field the backend also validates.
- Client-side validation is a UX convenience, never a security boundary — the backend re-validates independently at the trust boundary regardless of what the client already checked (Arch §13 rule 2). The frontend must never assume "the form already validated this" is sufficient reason to skip handling a `400 VALIDATION_ERROR` response.
- Field-level error messages come from Zod's own `.refine()`/`.message()` definitions in the shared schema, surfaced through React Hook Form's `formState.errors` — a component does not author its own duplicate copy of a validation message string.
- File-upload validation (type, size) is checked client-side **first** as a fast-fail UX layer (Spec §3.5 step 1), understanding this is explicitly a first line of defense only — the authoritative check (MIME + magic byte + ClamAV) happens server-side, per Arch §13 rule 6.

---

## 24. Error Handling Standards

- Every mutation and query's error path is handled through TanStack Query's `onError` (or the `error` return value) combined with the single shared `parseApiError()` utility in `lib/api.ts`, which translates the standard backend error envelope (Arch §9.2 — `{ success: false, error: { code, message, details } }`) into a user-facing message.
- A component **switches on `error.code`** (the stable `UPPER_SNAKE_CASE` string) for any error that should change the UI meaningfully (e.g., `INSUFFICIENT_BALANCE` showing a "top up points" CTA) — it never pattern-matches on `error.message`, which is display text, not a stable identifier.
- `error.message` from the envelope is safe to show to the user as-is (Arch §9.2) and is the default fallback display text when no code-specific UI treatment exists.
- An error is never logged-and-silently-continued for anything touching wallet, escrow, or auth flows on the frontend, mirroring the backend rule in Arch §6.6 — those flows always surface a visible `ErrorState` (Section 27) with a retry affordance.
- Network-level failures (no response at all, timeout) are distinguished from API-level `success: false` responses in `parseApiError()`, since they require different user messaging ("check your connection" vs. a business-meaningful error).

---

## 25. Loading State Standards

Every list-rendering or data-dependent feature component implements loading, empty (Section 26/27), and error states via the shared primitives in `components/ui/`, per Arch §11.8:

- **Loading:** a `<Skeleton>` shape matching the eventual content's layout — never a bare spinner for content whose shape is already known (a transaction list loads as skeleton rows shaped like transaction rows, not a centered spinner).
- A bare spinner is reserved for genuinely shape-less operations (a full-page initial auth check, a background mutation with no layout to mimic).
- Route-level `loading.tsx` files (Next.js convention) are used for full route-segment transitions; component-level loading inside an already-rendered shell uses the in-component `<Skeleton>` pattern so the surrounding dashboard chrome never re-suspends.
- React Suspense boundaries wrap any dashboard section with an independent, potentially-slow data dependency (Arch §14) — e.g., match suggestions loading independently of the rest of the dashboard shell — so the shell paints immediately while that section shows its own skeleton.

---

## 26. Skeleton Standards

- Skeletons are built from the shared `<Skeleton>` primitive in `components/ui/`, composed into shapes that visually approximate the real content's layout (card outlines, text-line bars at matching widths, avatar circles) — never a single generic gray box standing in for a complex card.
- A module's skeleton variant is named `<ComponentName>Skeleton` (Section 14) and lives beside the component it mimics, so the two stay in sync as the real component's layout evolves.
- Skeletons never include real or placeholder copy text that could be mistaken for actual data (no "Loading transaction #1234..." — just shaped bars).
- Skeleton animation (the shimmer/pulse effect) is a single shared CSS/Tailwind animation utility, defined once, never re-implemented per module.

---

## 27. Empty State Standards

- Every list-rendering feature component implements a shared `<EmptyState icon title description action? />` primitive (Arch §11.8) for the zero-results case — a module never renders a bare blank `<div>` or a plain "No data" text string.
- The `title` is a short, factual statement of the state ("No exchanges yet"); the `description` is one sentence of guidance; the optional `action` is a single clear next step, not a list of options ("Browse Discover to find your first match").
- Empty states are distinguished from **filtered-to-empty** states (a search/filter combination that legitimately returns zero results) — the latter's copy should reference the active filter rather than imply the user has never used the feature ("No skills match your filters" vs. "No skills listed yet").
- Empty-state icons come from the approved icon set (Section 37) — never a custom illustration introduced ad hoc by one module.

---

## 28. Responsive Design Standards

- The platform is "Web Application Only" and must be fully functional on mobile browsers (Spec §1.1) — there is no reduced "mobile-lite" feature set; every module ships responsive from its first PR, not as a follow-up pass.
- **Mobile-first authoring** is mandatory: unprefixed Tailwind classes target mobile, progressively enhanced with breakpoint prefixes (Arch §11.6) — a component is never built desktop-first and then "made responsive" afterward.
- Layout primitives (grids, flex containers) collapse gracefully at every breakpoint in Section 29 — a module's DoD (Section 56) includes verifying its own components at `sm`, `md`, and `lg` at minimum.
- Touch targets on interactive elements meet a minimum comfortable tap size on mobile viewports, consistent with WCAG guidance (Section 39), regardless of how compact the desktop equivalent is.
- Data-dense components (tables, ledger history) provide a genuinely usable mobile presentation (e.g., a card-based collapse of table rows below `md`), not merely a horizontally-scrolling shrunken table as the only mobile treatment.

---

## 29. Breakpoint Strategy

Tailwind's default breakpoint scale is adopted as-is, with no custom breakpoints (Arch §11.6):

| Breakpoint | Width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

The dashboard shell's primary layout shift (sidebar collapse to bottom-nav or drawer pattern) happens at `lg`; card-grid-to-single-column shifts happen at `md`; dense-table-to-card-list shifts happen at `md` or `sm` depending on the specific dataset's column count. A module documents its own breakpoint decisions in its component's local comments only where the choice is non-obvious — the breakpoint values themselves are never redefined per module.

---

## 30. Theme Architecture

- Theming flows in one direction: `packages/ui-tokens` (raw values) → `apps/web/tailwind.config.ts` (Tailwind theme extension) → `components/ui/*` (shadcn/ui primitives styled from the theme) → feature components (which consume only semantic Tailwind classes, never raw values) (Arch §11).
- Theme switching is handled exclusively by `next-themes`, class-strategy (`class="dark"` on `<html>`) (Arch §11.5) — no module implements its own theme-toggle logic or reads `prefers-color-scheme` directly.
- A correctly-built component that uses only semantic tokens (Section 32) never needs an explicit `dark:` Tailwind variant — dark mode "falls out" of the token system automatically. If a component needs a `dark:` override, that is a signal the component used a non-semantic value somewhere and should be fixed at the token-usage level, not patched with more `dark:` classes.
- The active theme (`light`/`dark`/`system`) is exposed to components that need to branch on it (rare — e.g., choosing a chart color palette) via `next-themes`' own hook, not duplicated into a Zustand store (Section 21.1).

---

## 31. Design Token Strategy

- `packages/ui-tokens/src/{colors,spacing,typography}.ts` is the single source of truth for every raw design value in the system (Arch §2.3). No component, anywhere in `apps/web`, hardcodes a raw hex color, a raw pixel value for spacing, or a raw `px`/`rem` font size (Arch §11).
- Tokens flow into `tailwind.config.ts`'s `theme.extend` block, which is the **only** place raw token values are referenced directly — every other file in the codebase consumes them through Tailwind's generated utility classes or the semantic CSS variables in Section 32.
- A new token (a new semantic color, a new spacing step) is added to `packages/ui-tokens` as part of the PR that first needs it, with a Changesets entry (Arch §7.5) — never inlined locally "just for this one component" with the intention of formalizing it later.
- Domain-specific tokens are added deliberately, not ad hoc, and only when a genuine platform-wide semantic concept needs one (Arch §11.3) — see Section 32.

---

## 32. Color System

Semantic CSS variables (shadcn/ui convention) are used everywhere in feature components; raw Tailwind color utilities (`bg-blue-500`) are forbidden outside `components/ui/`'s own primitive definitions (Arch §11.3):

**Base semantic set:** `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--destructive`, `--success`, `--warning`, `--border`, `--ring`.

**Domain-specific semantic set** (added deliberately, per Arch §11.3): `--color-points` (SkillPoints branding), `--color-verified` (verified badge), `--color-escrow` (escrow/pending state).

Rules:
- A feature component reaches for `bg-primary`, never `bg-blue-500`, even if the two currently render the same pixel color — the semantic name is what survives a rebrand or a dark-mode variant; the raw utility does not.
- Color is never the only signal (Arch §11.4) — escrow status, verification state, and dispute state each combine an icon **and** text **and** color, since these are exactly the color-coded states the platform's accessibility commitment (Section 39) calls out by name.
- A new domain-specific color token is proposed only when an existing semantic token genuinely cannot express the concept — not for every new visual flourish a module wants.

---

## 33. Typography System

A fixed semantic scale, used **by name**, never by raw Tailwind text-size utility in a feature component (Arch §11.2):

| Semantic role | Tailwind class | Use |
|---|---|---|
| `display` | `text-4xl md:text-5xl font-bold` | Landing page hero only |
| `heading-1` | `text-3xl font-semibold` | Page titles |
| `heading-2` | `text-xl font-semibold` | Section headers |
| `heading-3` | `text-lg font-medium` | Card titles |
| `body` | `text-base` | Default paragraph/UI text |
| `body-sm` | `text-sm` | Secondary text, metadata |
| `caption` | `text-xs text-muted-foreground` | Timestamps, helper text |

These seven roles are exhaustive for launch scope. A module that believes it needs an eighth role raises it for a token addition (Section 31) rather than reaching for an arbitrary `text-[13px]` one-off.

---

## 34. Spacing System

Tailwind's default 4px base scale is adopted as-is (`0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24…`), per Arch §11.1. Component-level spacing decisions use semantic Tailwind spacing classes (`gap-4`, `p-6`, `space-y-2`) — never inline `style={{ margin: '13px' }}` and never an arbitrary Tailwind bracket value (`p-[13px]`) except in a documented, reviewer-approved edge case (e.g., matching a third-party SDK's fixed iframe dimensions). Consistent spacing multiples are what make the dashboard shell feel like one product across fourteen independently-built modules — a module choosing its own spacing rhythm is a visible, immediate tell of inconsistency.

---

## 35. Border Radius Standards

- Radius values come from the Tailwind theme's `borderRadius` scale as extended by `packages/ui-tokens`, consumed via semantic classes (`rounded-md`, `rounded-lg`, `rounded-full`) — never an arbitrary bracket value.
- shadcn/ui's own default radius token (`--radius`) is the base every `components/ui/` primitive derives from; feature components inherit radius from the primitive they compose rather than re-specifying it.
- A consistent radius scale (e.g., `rounded-md` for cards/inputs, `rounded-lg` for modals/larger surfaces, `rounded-full` for avatars/pills/badges) is applied uniformly — a module does not introduce a bespoke corner treatment for its own cards.

---

## 36. Elevation & Shadow Standards

- Shadow/elevation is expressed through a small, fixed set of semantic Tailwind shadow utilities (e.g., `shadow-sm` for resting cards, `shadow-md` for hover/raised states, `shadow-lg` for modals/popovers/dropdowns) — not an arbitrary per-component shadow value.
- Elevation increases monotonically with interaction layer: base content < raised/hover card < popover/dropdown < modal/dialog. A module never gives a resting card a heavier shadow than an open modal.
- Dark mode elevation relies on the semantic token system (Section 30) — shadows are de-emphasized and border-based separation is favored over heavy shadows in dark mode, consistent with common dark-UI practice, rather than each module inventing its own dark-mode shadow treatment.

---

## 37. Icon Usage Standards

- **Lucide Icons** is the platform's one and only icon set (locked stack). No module imports a second icon library, inlines a custom SVG icon for a concept Lucide already covers, or hand-draws an icon as an image asset.
- Icons are sized via Tailwind classes tied to the typography/spacing scale they sit beside (commonly `size-4` inline with `body`/`body-sm` text, `size-5`–`size-6` for standalone action icons), not arbitrary pixel values.
- Icons that convey meaning (not purely decorative) always ship with an accessible label — either visible text beside them or an `aria-label`/`sr-only` text node — per Section 41. Purely decorative icons are marked `aria-hidden` (Arch §11.4).
- Icon color follows the semantic color system (Section 32) — `text-muted-foreground` for neutral/secondary icons, `text-destructive` for danger actions, etc. — never a raw color value.

---

## 38. Animation Standards

- **Tailwind's built-in transition utilities** handle all micro-interactions (hover states, focus rings, simple fades/slides) — this is the default for essentially everything.
- **Framer Motion** is reserved for orchestrated, multi-element animations where Tailwind alone is insufficient (Arch §11.7) — e.g., a badge-award celebration sequence, a level-up modal, a multi-step transition between dashboard sections. A module does not reach for Framer Motion for a simple hover/opacity change that a Tailwind transition class already handles.
- `prefers-reduced-motion` is respected everywhere: any Framer Motion animation is gated behind a `useReducedMotion()` check, and Tailwind's own `motion-reduce:` variant is applied to any CSS transition/animation of meaningful magnitude (Arch §11.7). This is not optional per-module — it is part of every animated component's DoD (Section 56).
- Animation duration and easing values are drawn from a small, consistent set (e.g., `150ms`/`200ms`/`300ms` with a shared easing curve) defined once, not re-tuned per component to "feel right" in isolation.

---

## 39. Accessibility Standards

WCAG 2.1 AA is the platform-wide floor, not a stretch target (Arch §11.4) — the Proposal explicitly targets inclusivity for economically and demographically diverse users (Proposal §4.3), which makes accessibility a product requirement, not an engineering nicety.

- All interactive elements are reachable and operable by keyboard (Section 40); a visible focus ring (`ring-2 ring-ring`) is never suppressed with `outline: none` alone.
- All shadcn/ui (Radix) primitives are used specifically because they ship correct ARIA roles and labeling out of the box (Arch §11.4) — a custom interactive component (one not built from a `components/ui/` primitive) must match that same bar before it is merged, verified against WCAG 2.1 AA criteria, not assumed compliant.
- Color is never the only signal (Section 32) — this applies to every color-coded state in the system: escrow status, verification badges, dispute states, rating stars, leaderboard tier colors.
- All images (avatars, uploaded portfolio samples) require meaningful `alt` text; purely decorative icons/images use `aria-hidden` (Arch §11.4, Section 37).
- Color contrast for all text/background and meaningful-icon/background pairs meets WCAG 2.1 AA thresholds (4.5:1 normal text, 3:1 large text/UI components) — verified against the actual semantic tokens in both light and dark mode, not just light mode.
- Forms (Section 22) associate every input with a visible or programmatically-linked `<label>`, and surface validation errors in a way assistive technology announces (Section 41).

---

## 40. Keyboard Navigation Standards

- Every interactive element (buttons, links, form controls, custom dropdowns/menus/tabs built on Radix) is reachable via `Tab`/`Shift+Tab` in a logical order matching visual layout — no `tabindex` value greater than `0` is ever used to manually reorder focus; DOM order is fixed instead.
- Modals and dialogs trap focus while open (Radix's built-in `Dialog` behavior — never hand-rolled) and return focus to the triggering element on close.
- Custom composite widgets (menus, comboboxes, multi-step wizards) follow the standard keyboard interaction pattern for their ARIA role (arrow keys within a menu, `Escape` to close, `Enter`/`Space` to activate) — again, delegated to the underlying Radix primitive rather than reimplemented.
- Skip-to-content is provided at the dashboard-shell level so keyboard users are not forced to tab through the sidebar/navbar on every route change.
- No feature is keyboard-inaccessible even if a mouse/touch equivalent exists — drag-and-drop interactions (if any module introduces one) ship a keyboard-operable alternative from the same PR, not as a follow-up.

---

## 41. Screen Reader Standards

- Every non-decorative icon, image, and icon-only button carries an accessible name (`aria-label`, visually-hidden text, or equivalent) describing its action or content, not its appearance (`aria-label="Delete message"`, not `aria-label="trash icon"`).
- Live, dynamically-updating content that matters to the user without a page navigation (a new chat message arriving, a transaction status change, a toast notification) is announced via an appropriate `aria-live` region — polite for non-urgent updates, assertive only for genuinely urgent/blocking ones — rather than silently updating the DOM.
- Form validation errors are programmatically associated with their field (`aria-describedby`/`aria-invalid`) so a screen reader announces the error at the point of focus, not just visually beside the field.
- Landmark regions (`<nav>`, `<main>`, `<header>`, `<aside>`) are used correctly in the dashboard shell so screen reader users can navigate by region, not just linearly through the DOM.
- Loading and empty states (Sections 25–27) are announced appropriately (e.g., a loading region marked so its completion is detectable) rather than silently swapping skeletons for content with no assistive-technology signal.

---

## 42. Dark Mode Strategy

- `next-themes`, class-strategy, exactly as specified in Arch §11.5 — `class="dark"` applied to `<html>`, driven by the same semantic CSS variables described in Section 32.
- System preference (`prefers-color-scheme`) is respected by default on first visit; an explicit user override, once made, is persisted (via `next-themes`' own persistence mechanism) and takes precedence over system preference on return visits.
- Because components consume only semantic tokens (never raw colors — Section 32), dark mode is a **token-level** concern, not a **component-level** concern — a correctly-built component requires zero `dark:`-prefixed Tailwind classes. Any component that needs one is flagged in review (Section 55) as a signal the token system was bypassed somewhere.
- Dark-mode-specific elevation treatment (Section 36) and any dark-mode-specific asset (e.g., a logo variant) are defined once, centrally, not per module.

---

## 43. Performance Standards

Performance standards mirror Architecture Foundation §14, restated for frontend engineers as binding rules, not aspirations:

| Area | Standard |
|---|---|
| Rendering strategy | Public, SEO-relevant routes (`(public)`) are SSR/SSG; authenticated routes (`(dashboard)`, `(admin)`) are CSR with TanStack Query — SSR adds no value behind a login wall and only increases TTFB. |
| Streaming | React Suspense boundaries wrap any dashboard section with an independent, potentially-slow data dependency, so the shell paints immediately (Section 25). |
| HTTP caching | `Cache-Control` behavior is set by the backend per endpoint (Arch §14); the frontend respects it via TanStack Query's own `staleTime`/`gcTime` configuration per query key, tuned per data volatility (a leaderboard query has a longer `staleTime` than a live chat query). |
| Bundle size | Automatic per-route code splitting from the App Router is the baseline (Section 44); manual splitting is reserved for the specific heavy components named in Section 45 — a module does not preemptively micro-split components that don't need it. |
| Re-renders | `useMemo`/`useCallback`/`React.memo` are applied only where a profiler-confirmed cost exists (Section 43.1) — never applied reflexively. |
| Images | `next/image` exclusively (Section 47). |

### 43.1 Memoization Discipline

`useMemo`/`useCallback` are used only where a profiler has confirmed an expensive derived computation or a callback passed to a memoized child in a long list — not applied reflexively to every function, which the React team itself advises against as premature optimization (Arch §14). `React.memo` **is** applied, as a standing rule (not case-by-case), to list-item components in genuinely long lists: skill cards, leaderboard rows, message bubbles — because these are exactly the components a profiler will always confirm benefit from it, so the profiling step is skipped for this specific, pre-approved case.

---

## 44. Code Splitting Strategy

- Automatic per-route splitting from the Next.js App Router is the baseline for every route in the system — no configuration needed, and no module should try to defeat or bypass it.
- Manual `dynamic()` splitting (Section 46) is added **only** for the specific heavy, rarely-immediately-needed components named in Section 45 — not applied preemptively everywhere, which the Architecture Foundation explicitly warns against as it increases request count without benefit (Arch §14).
- A module's own feature folder does not need internal micro-splitting beyond the route-level baseline unless a specific component matches the profile in Section 45.

---

## 45. Lazy Loading Strategy

Heavy, rarely-immediately-needed components are dynamically imported via `next/dynamic` (Section 46), with `ssr: false` where the component has no meaningful server-rendered state (Arch §14):

- Video/voice calling UI (`calling` module) — never needed until a call is actually initiated.
- Rich text editor (wherever used, e.g., long-form community post composition) — heavy third-party editor payload, not needed on initial page paint.
- Admin analytics charts (`admin` module) — charting library payload is significant and admin routes are already gated behind role-based access, so there's no SEO/first-paint cost to deferring it.

A module proposing a new lazy-loaded component beyond this list justifies it against the same criteria — genuinely heavy dependency, genuinely not needed on initial render — rather than lazy-loading reflexively.

---

## 46. Dynamic Import Standards

- `next/dynamic` is the only mechanism for manual code splitting — no module hand-rolls `React.lazy`/`Suspense` for this purpose when `next/dynamic` already provides the App-Router-aware equivalent with built-in SSR control.
- Every dynamically-imported component supplies a `loading` fallback matching Section 25's skeleton standards — a dynamic import never flashes a blank area while its chunk downloads.
- `ssr: false` is applied only to components that are meaningfully client-only (e.g., they touch `window`, WebRTC APIs, or a browser-only third-party SDK) — not applied by default to every dynamically-imported component, since some heavy components (e.g., a rich text editor with SSR-safe initial markup) still benefit from server rendering their static shell.

---

## 47. Image Optimization Strategy

- `next/image` is used exclusively for any user-facing image in `apps/web` — no bare `<img>` tag appears in any feature component, enforced by the ESLint `@next/next/no-img-element` rule (Arch §14).
- Uploads (avatars, portfolio images) are resized server-side (Sharp, per Arch §14) to standard dimensions at ingest — the frontend never resizes an image client-side "per render" as a substitute for correct server-side processing; `next/image`'s `sizes`/responsive `srcset` handles delivery-time responsiveness on top of an already-correctly-sized source.
- Every `next/image` usage supplies explicit `width`/`height` (or `fill` with a properly sized, positioned container) to prevent layout shift — an image never renders without reserved space.
- Meaningful `alt` text is mandatory on every `next/image` usage (Section 39); decorative images use an empty `alt=""` (not omitted) so screen readers correctly skip them, distinct from `aria-hidden` icons (Section 37).

---

## 48. Frontend Security Best Practices

- **Secrets never reach the client.** No `NEXT_PUBLIC_*` environment variable holds anything more sensitive than a publishable/public key (Arch §13 rule 1, Section 49) — a module introducing a new `NEXT_PUBLIC_` variable gets that specifically flagged in review (Section 55).
- **No direct backend resource access.** `apps/web` communicates with `apps/api` exclusively via the REST client (`lib/api.ts`) and the Socket.io singleton (`lib/socket.ts`) — never a direct connection to PostgreSQL, Redis, or Cloudflare R2 (Arch §4.1). The sole exception is the browser uploading a file **to** R2 using a presigned URL the backend generated — the frontend never holds R2 credentials.
- **Access tokens live in memory, never `localStorage`.** Per Spec §3.6, the JWT access token is held in memory (e.g., inside the `authStore` Zustand slice, Section 21.1) to prevent XSS-based token theft; the refresh token is an httpOnly cookie the frontend never reads or writes directly.
- **Sanitize user-generated content before render.** Any user-generated content rendered as HTML (bios, chat messages, community posts) is passed through `DOMPurify` client-side before render, as the client-side half of the platform's two-layer sanitization requirement (server-side `sanitize-html` is the other half, owned by the backend) (Arch §13 rule 5).
- **No ad-hoc `fetch()` calls.** Every network call goes through the single configured `lib/api.ts` client (Arch §4.1) — this is also a security control, since it's the one place CSRF tokens, auth headers, and error-envelope parsing are applied consistently; a scattered `fetch()` call bypasses all of them silently.
- **Never trust client-side role/permission checks alone.** UI-level conditional rendering based on role (e.g., hiding an admin action from a non-admin user) is a UX convenience, not a security boundary — the backend's guards are the actual enforcement (Arch §13 rule 3); the frontend never assumes hiding a button is sufficient.

---

## 49. Environment Variable Usage (Frontend)

- Every required environment variable is documented in `apps/web/.env.example` with a placeholder value and an explanatory comment (Arch §8.1) — this is the contract every future contributor (human or AI) reads to know what the frontend needs.
- `apps/web/lib/env.ts` validates the environment at build/boot time against a schema and **fails fast** rather than failing on first use (Arch §8.2) — no module reads `process.env.X` directly anywhere else in the codebase.
- Only variables prefixed `NEXT_PUBLIC_` are accessible to client-side code, and `lib/env.ts` is the only place even those are read from — a component never references `process.env.NEXT_PUBLIC_X` inline.
- `.env.local` is gitignored and never committed (Arch §8.1); `.env.staging`/`.env.production` never exist as files — they're injected by Vercel's environment variable system (Arch §8.1/§8.3).
- A new `NEXT_PUBLIC_` variable is added only when the value is genuinely safe to ship to every browser on the internet (e.g., the Agora App ID, a public API base URL) — never a secret, ever, regardless of how the module justifies the exception (Arch §13 rule 1).

---

## 50. API Client Organization

- `lib/api.ts` is the **one** configured fetch wrapper for the entire application — it owns base URL configuration, auth header injection, the standard response-envelope parsing (Arch §9.1), and the shared `parseApiError()` utility (Section 24). No other file constructs its own `fetch`/`axios` instance.
- Each module's REST surface is wrapped in a thin `lib/api/<module>.ts` slice — plain functions calling the shared client against that module's `/api/v1/*` endpoints, typed using `@talentswap/types` request/response shapes (Master Plan §3.1 FE standard inputs/outputs table).
- A component or hook never calls `fetch()` directly, and never calls another module's `lib/api/<other-module>.ts` slice directly from inside its own module's UI layer without going through that module's own hook first — the module boundary (Section 3) applies to API client slices exactly as it applies to components.
- Server-side data fetching inside Server Components uses this same `lib/api.ts` client and the same versioned endpoints as client-side code (Section 5) — there is no server-only shortcut client.
- WebSocket connections are handled exclusively through `lib/socket.ts`'s singleton client (Section 21.2) — a module never opens a second Socket.io connection for its own purposes.

---

## 51. Error Boundary Strategy

- React Error Boundaries wrap each major route group (`(dashboard)`, `(admin)`) at the layout level (Section 7), catching render-time failures without crashing the entire application (Arch §6.6).
- A module with a component prone to a well-understood failure mode (e.g., the calling module's WebRTC surface) may add its own nested Error Boundary scoped to just that feature, so a failure there doesn't take down the rest of an otherwise-working dashboard page — this is the module's own decision, additive to, not a replacement for, the route-group-level boundary.
- Error Boundary fallback UI uses the shared `<ErrorState>` primitive (Section 27) — never a bare, unstyled "Something went wrong" string with no recovery action.
- Errors caught by a boundary are reported to Sentry (Section 52) with enough context (route, module, user ID if available) to be actionable, not just logged silently to the console.

---

## 52. Logging Standards (Frontend)

- **Sentry** is the platform's frontend error-tracking and performance-monitoring tool (Spec §2.7.5/§7) — every unhandled exception, every Error Boundary catch (Section 51), and every meaningfully-failed mutation is reported to Sentry with relevant context (route, module name, a scrubbed user identifier — never PII beyond what's already necessary).
- `console.log`/`console.warn`/`console.error` are development-only aids and are never relied upon as the application's actual logging mechanism — they are stripped or no-op'd in production builds, consistent with the backend's own `debug`-level-stripped-in-production convention (Arch §6.7).
- No secret, token, or full credential-document content is ever logged to the console or sent to Sentry, mirroring the backend's redaction rule (Arch §6.7) — this applies to accidental logging in a `catch` block as much as to deliberate debug statements.
- Sentry's `requestId` context is populated from the backend's response `meta.requestId` (Arch §9.1) wherever available, so a user-reported frontend error can be cross-referenced to the exact backend log line that produced it.

---

## 53. Testing Standards

- Every React component that contains meaningful logic (conditional rendering, event handling, derived display state — not a pure presentational wrapper) ships a co-located `<ComponentName>.test.tsx` file (Arch §5.1), using **Jest + React Testing Library** as the component-testing toolchain — chosen because it is already the monorepo's testing runtime (the backend's own `*.spec.ts`/`*.e2e-spec.ts` suites run on Jest, per Spec §6.2) and is the de facto standard for this stack; this is a tooling clarification within the Frontend Architect's own remit (Arch §3.3), not a new framework introduction, since the Architecture Foundation names the `*.test.tsx` convention but does not name a runner.
- Component tests assert on user-visible behavior (rendered text, accessible roles, fired callbacks) — never on implementation details like internal state shape or CSS class names.
- Hooks with non-trivial logic (a module's `use<Module>` query/mutation hooks, especially any client-side derived-state logic) are tested via React Testing Library's hook-testing utilities, mocking the underlying `lib/api/<module>.ts` slice — never hitting a real network call in a unit test.
- Per each `FE-xx` module's own Definition of Done (Master Plan §3.1), frontend component-level tests are **part of that module's own DoD** and are not separately tracked as their own `TEST-xx` ID (unlike backend suites) — this is already the Master Development Plan's ruling and is restated here so a frontend session knows not to look for a separate frontend test module ID.
- End-to-end, cross-module browser verification is handled at the `INT-xx` level (Master Plan §3.10) — manual and automated verification against a running instance, coordinated by Jacob with the relevant architects (Master Plan §9.2). Selection of any additional browser-automation tooling beyond what's described here (e.g., for `INT-17`'s full regression pass) is Erwin's decision if/when the project needs it, not something this document unilaterally introduces.
- Accessibility is checked as part of a component's test coverage where practical (e.g., asserting on accessible roles/names via Testing Library's accessible queries, which inherently fail a test if a component isn't properly labeled) — this is a natural byproduct of testing "the way a user/assistive technology would query the DOM," which is Testing Library's own guiding philosophy, not an additional separate test suite.

---

## 54. Documentation Standards

- Every frontend module folder (`components/features/<module>/`) may include a short `README.md` when the module's data flow or a non-obvious decision genuinely needs explaining beyond what types and code already say — this is the exception, not a mandatory boilerplate file for every module, consistent with the DRY spirit of Arch §10.2.
- Any README that does exist links to or references the Architecture Foundation/Master Plan/this Constitution for anything already documented there — it never duplicates content from a source-of-truth document (mirrors Master Plan §11 DoD-DOC rule).
- Complex hooks and non-obvious components carry a brief top-of-file comment stating *why* a particular approach was taken when it isn't self-evident from the code — not a restatement of *what* the code does, which the code itself already shows.
- Component props types (Section 17) are the primary "documentation" for how to use a component — a well-named, well-typed props interface is preferred over a prose explanation of the same information.
- No separate component-catalog/Storybook-style tooling is introduced at this time, since it is not part of the locked stack (Section 0) — if a future session believes one is warranted, that is raised as a proposal to Erwin/John, not adopted unilaterally.

---

## 55. Frontend Review Guidelines

Every frontend PR is reviewed in this fixed order, mirroring the backend's own review discipline (Arch §7.4):

1. **Module boundary** — does it stay inside its Section 3 boundary? Does it avoid deep-importing another module's internals (Section 19/20)? Any violation is an automatic "request changes," not a style nit.
2. **State placement** — is server state in TanStack Query, ephemeral global state in Zustand, everything else local (Section 21)? A duplicated copy of server state anywhere is treated with the same severity as a boundary violation, given the platform's financial-grade correctness requirements.
3. **Naming and typing** — does it follow Sections 12–17 exactly? Does `strict` TypeScript pass with zero `any`?
4. **Design system compliance** — semantic tokens only (Sections 31–36), no raw hex/px values, no bypassed `dark:` overrides (Section 42) that signal a token was skipped.
5. **Accessibility** — keyboard operability (Section 40), screen reader labeling (Section 41), color-plus-signal redundancy (Section 32/39) — checked concretely, not assumed because "it uses shadcn/ui."
6. **Loading/empty/error states** — all three implemented per Sections 25–27 for any data-dependent component.
7. **Performance** — no reflexive memoization (Section 43.1), correct use of `next/image` (Section 47), lazy-loading applied only where Section 45 calls for it.
8. **Business logic correctness** — is the module's own feature behavior correct against its spec.
9. **Tests** — is coverage present per Section 53, and green in CI.

No PR is approved with an `eslint-disable` on a boundary, strict-mode, or accessibility-linked rule without an inline comment explaining why and a linked follow-up issue (mirrors Arch §7.4). PRs touching `wallet`, `transactions`, or `auth` frontend surfaces (`FE-05`, `FE-06`, `FE-01`) require **two** reviewer approvals per Arch §7.3/§13 rule 7, exactly as their backend counterparts do, given their financial/security criticality.

---

## 56. Definition of Done for Frontend Modules

A frontend module (`FE-xx`) is not `Approved` (Master Plan §7.1 status ladder) until every applicable item below is satisfied, derived directly from Architecture Foundation §17.4 and Master Development Plan §11's `DoD-FE` checklist:

- [ ] Stays entirely inside its Section 3 module boundary; the extended `check-boundaries.ts` (Section 20) passes for `apps/web`.
- [ ] Naming matches Sections 12–17 exactly.
- [ ] `strict` TypeScript passes with zero `any`.
- [ ] All state is correctly categorized per Section 21 — no server data duplicated into Zustand, no ad hoc global state for something that should be local.
- [ ] Validation schema lives in `@talentswap/validation`, shared with the backend DTO (Section 23) — no locally re-implemented schema.
- [ ] Loading, empty, and error states implemented per Sections 25–27 for every data-dependent component.
- [ ] Responsive at `sm`/`md`/`lg` minimum (Section 28); no horizontal scroll traps outside deliberately-scrollable regions (tables, code blocks).
- [ ] WCAG 2.1 AA verified for the module's new surfaces (Section 39) — keyboard path (Section 40), screen reader labeling (Section 41), and color-contrast checked, not assumed.
- [ ] Dark mode verified — zero unnecessary `dark:` overrides (Section 42).
- [ ] No raw hex/px design values introduced (Sections 31–36).
- [ ] `next/image` used for every image; no bare `<img>` (Section 47).
- [ ] Heavy components (if any match Section 45's criteria) are lazy-loaded via `next/dynamic` with a proper fallback (Section 46).
- [ ] No secret or non-public value introduced via a `NEXT_PUBLIC_` variable (Section 49).
- [ ] All network access goes through `lib/api.ts` / `lib/api/<module>.ts` / `lib/socket.ts` — no ad hoc `fetch()` (Section 50).
- [ ] Errors from this module's mutations/queries are handled per Section 24 and reported to Sentry per Section 52 where unhandled.
- [ ] Component/hook tests included per Section 53; CI green.
- [ ] PR reviewed per Section 55, with two-reviewer sign-off if the module is `auth`/`wallet`/`transactions`.
- [ ] Erwin's final integration approval recorded (AI SDLC §3.1), consistent with every other module category in the system.

---

## 57. Future Frontend Module Development Rules

Written directly for whoever — human or a future Claude session — picks up the next frontend module from the Master Development Plan's Roadmap (§5 Sprint Plan). Follow it exactly; do not improvise a different structure even if it seems simpler for one module in isolation, per Architecture Foundation §17.

### 57.1 Before writing any code

1. Confirm this Constitution has been re-read in full — it, not memory of a previous session, governs.
2. Re-read Architecture Foundation §3.2 for the module's frontend boundary and its backend counterpart's boundary (frontend modules mirror backend modules one-to-one, Section 3 above).
3. Confirm the module's corresponding `BE-xx` is `Approved` (Master Plan §7.2 tracking table) — a frontend module is never built ahead of its backend contract; if it isn't ready, stop and flag it rather than building against a guessed API shape.
4. Locate the module's exact placeholder location in the Section 2 tree above. Do not create files outside it.

### 57.2 Building a frontend module

1. Create `components/features/<module>/` and the matching route segment(s) under the correct route group per Section 6.
2. Create `lib/api/<module>.ts` — thin wrapper functions calling the shared `lib/api.ts` client, typed using `@talentswap/types` (Section 50).
3. Create `hooks/use<Module>.ts` (or co-located hooks) — TanStack Query hooks using the query-key structure from Section 21.2; mutations live here, never inline in components.
4. Build forms with React Hook Form + the same Zod schema from `@talentswap/validation` used by the corresponding backend DTO (Section 22–23).
5. Compose UI exclusively from `components/ui/` primitives and semantic tokens (Sections 31–37) — never introduce a one-off styled element that isn't reusable and isn't promoted per Section 9's promotion rule.
6. Wire any real-time updates for this module through the existing `lib/socket.ts` singleton and Section 21.2's cache-update rule — never open a second socket connection.
7. Implement loading/empty/error states (Sections 25–27), responsive behavior (Section 28), and accessibility (Sections 39–41) as part of the same PR that introduces the feature — not as a follow-up pass.
8. Write component/hook tests per Section 53.
9. Verify against Section 56's Definition of Done in full before opening the PR.
10. Open the PR named with the module in scope, per Section 55's review order — expect two-reviewer sign-off if the module is `auth`/`wallet`/`transactions`.

### 57.3 What never changes without amending this document

The four-category state model (Section 21); the module boundary list mirroring Arch §3.2 (Section 3); the naming conventions (Sections 12–17); the path alias / import rules (Sections 18/20); the design-token flow (Sections 31–36); the Definition of Done (Section 56). If a future module genuinely cannot fit these constraints, that is a signal to raise it with Erwin — via the same ADR mechanism the Architecture Foundation itself uses (Arch §17.5, §18) — not to quietly deviate inside one module's PR.

---

## Appendix A — Change Log

Per AI SDLC §1 (Governance Rules, frozen) and this document's own Change Control statement, amendments are only ever made via explicit approval, a critical architectural issue, or a formal ADR.

| Version | Date | Change | Author | Status |
|---|---|---|---|---|
| FE-CON-v1.0 | 2026-08-04 | Initial draft — full Frontend Constitution covering Sections 1–57, derived from Architecture Foundation v1.1, Master Development Plan v1.1, Technology Specification v1.0, and Proposal v2.0. | John (Frontend Architect) | Proposed — pending Erwin's ratification |
| FE-CON-v1.0 | 2026-08-04 | Ratified — Erwin approved the document as drafted, no amendments required. Status changes from Proposed to 🔒 Frozen. | Erwin (Lead Architect) | Ratified — binding on all future `FE-xx` module sessions |

---

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| **Constitution** | This document — the binding frontend engineering standard for TalentSwap. |
| **Module (frontend)** | One of the fourteen domain feature areas (Section 3) plus `public-pages` and `dashboard-shell`, each owning its own route(s), components, hooks, and API client slice. |
| **Server state** | Any data whose source of truth is the backend API; owned exclusively by TanStack Query (Section 21.2). |
| **Global ephemeral UI state** | Client-only state with no server counterpart, needed across distant components; owned exclusively by Zustand (Section 21.1). |
| **Semantic token** | A named design value (e.g., `--color-escrow`, `heading-2`) that abstracts a raw value so the raw value can change without touching component code (Sections 31–36). |
| **Barrel file** | A module's `index.ts`, exporting only its intended public surface (Section 19). |
| **Route group** | A parenthesized App Router folder (`(public)`, `(auth)`, `(dashboard)`, `(admin)`) that organizes routes without affecting the URL (Section 6). |
| **DoD** | Definition of Done — the fixed completion checklist a module must satisfy before `Approved` status (Section 56). |
| **ADR** | Architecture Decision Record — the only mechanism by which this Constitution, or the Architecture Foundation it implements, may be amended. |

---

_This document defines standards only. It builds no feature and contains no implementation. Its purpose is to make every frontend module built afterward — by any engineer, human or AI, in any session — consistent, independently reviewable, and safe to extend toward the scale target set out in the Technology Specification._

**— End of Frontend Constitution (FE-CON-v1.0) —**
