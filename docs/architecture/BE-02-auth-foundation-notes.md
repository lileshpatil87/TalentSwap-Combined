# BE-02 — Authentication Foundation: Delivery Notes

Written for Erwin (Lead Architect) and Jacob (PM), flagging items
discovered or decided during this build rather than resolved unilaterally
— the same discipline the Master Development Plan itself uses for C-1…C-5
and FE-01's own delivery notes use for its two items.

## 1. Module ID and scope, relative to the Master Development Plan

The task brief labels this delivery `BE-02 — Authentication Foundation`,
following a `FOUND-01`/`BE-01`/`BE-02`/`DEV-01` numbering scheme distinct
from **both** other schemes already present in this repository:

- Master Development Plan §3.4: `BE-01` = **Auth Module** (Roadmap #1),
  full scope (registration, login, JWT, refresh, **OAuth**).
- `apps/api/README.md` (BE-01's own delivery): flagged that its actual
  scope maps to `FOUND-01/02/03/04/05/08`, not `BE-01`.
- This task's scheme: `BE-01` = "Backend Foundation" (matches the
  `FOUND-*` scope above), `BE-02` = "Authentication Foundation" (this
  delivery) — narrower than the Master Plan's `BE-01`, since OAuth,
  password reset, email verification, and 2FA are explicitly absent from
  this task's own enumerated IMPLEMENT list (see `src/modules/auth/README.md`
  for the itemized deferral table and why each is deferred, not omitted
  by oversight).

Three schemes, two different scope boundaries, now coexist in this
repo's history. As FE-01's notes already flagged the same class of issue:
whoever owns the module registry should reconcile which scheme is
authoritative before marking anything "Approved" against the Master
Development Plan's own tracking table (§7.2) — this delivery implements
the task-brief scope as given, labeled `BE-02` per that brief, and does
not attempt to silently reinterpret it as the Master Plan's full `BE-01`.

## 2. `Role` / `UserRole` enum casing — a deliberate divergence from the Spec's example values

`packages/types/src/auth.types.ts`'s `Role` enum and
`prisma/schema.prisma`'s `UserRole` enum both use UPPER_SNAKE_CASE
runtime string values (`Role.ADMIN === 'ADMIN'`), not the lowercase
values Technology Specification §4.1.1 uses in its illustrative example
(`user | verified_user | moderator | admin`).

This was a live conflict, not a style preference: Prisma's generated
client uses each enum member's own declared name as its runtime string
value (no `@map` was used — see the schema's own `// === auth module ===`
comment for why `@map`ping would only recreate the exact mismatch this
avoids), so *some* casing decision was unavoidable the moment a real
`UserRole` column had to exist. Backend Constitution §19 is explicit that
a backend TypeScript enum must mirror its Prisma counterpart **one-to-one
in both name and member set**, and Architecture Foundation §5.2 mandates
UPPER_SNAKE_CASE enum members generally. Given this document's own
governing-document priority order (Architecture Foundation > Master
Development Plan > Backend Constitution's own listed priority puts the
Spec below all three), UPPER_SNAKE_CASE was chosen.

**Flagging for explicit confirmation, not presenting as settled:** if
Erwin's intent was for the *database column values themselves* to stay
lowercase (e.g. for readability in raw SQL / admin tooling / existing
external integrations that might expect the Spec's literal casing), the
fix is a one-line change (add `@map("...")` to each `UserRole` member in
`schema.prisma`) with no consumer-facing impact, since Prisma Client
already abstracts the mapped value away from application code entirely —
please confirm either way before this reaches a second domain module
that also has an enum column, since the same choice will need to repeat
consistently.

## 3. `passwordHash` nullability — Spec's own internal contradiction

Technology Specification §4.1.1's `users.password_hash` row says
`NOT NULL` in its Constraints column but `NULL for OAuth-only accounts`
in its Description column — contradictory as written. `password_hash` was
made nullable in `schema.prisma`, matching the Description (and leaving
room for the OAuth follow-up in §4 below), not the Constraints column.
Flagged rather than silently picking a side.

## 4. Deliberately deferred, not overlooked

Per this task's own enumerated IMPLEMENT list (which does not mention
OAuth, password reset, email verification, 2FA, or account lockout,
despite the Architecture Foundation / Technology Specification describing
all five as part of `auth`'s eventual full scope), the following were
consciously left out of this delivery. Full rationale and exactly where
each plugs back in: `src/modules/auth/README.md`'s "What this module
deliberately does NOT implement (yet)" table.

- OAuth (Google/LinkedIn) via Passport strategies — needs real provider
  credentials this environment doesn't have.
- Password reset / email verification — needs the `notifications` module
  (Roadmap #7), which doesn't exist yet; Backend Constitution §57 step 3
  says not to build around a missing dependency with a shortcut.
- 2FA (TOTP).
- Account-lockout-after-N-failed-logins (the existing `RateLimitGuard`
  `auth` tier — 5 req/15 min/IP, already wired — covers network-level
  brute-force mitigation for this Foundation delivery; a per-account
  counter is a natural, additive follow-up).

None of the above blocks anything already built; each is additive to the
existing module boundary, not a restructuring.

## 5. Foundation gap found and closed: `packages/types`/`packages/validation` were never wired into `apps/api`

`apps/api`'s `package.json` had zero dependency on either workspace
package, and its `tsconfig.json` had no path mapping for them, despite
both packages already existing (from the frontend-foundation delivery)
and Architecture Foundation §2.3 mandating them as "the ONLY legal way
`apps/web` and `apps/api` agree on a data shape." `common/enums/role.enum.ts`
had already flagged this exact gap in its own header comment as a
follow-up for "whoever builds FOUND-02" — packages/types existing wasn't
enough on its own; this delivery is the first to actually consume it from
the backend side, so it closed the wiring gap as part of building the
first thing that needed it (`Role`, `AuthenticatedUser`,
`registerSchema`/`loginSchema`). See `apps/api/package.json` (new
`@talentswap/types`/`@talentswap/validation` workspace dependencies, plus
matching jest `moduleNameMapper` entries) and `apps/api/tsconfig.json`
(new `paths` entries, mirroring `apps/web/tsconfig.json`'s existing
pattern) for the exact change. `apps/api/tsconfig.json` was deliberately
**not** switched to `extends: "../../tsconfig.base.json"` — see that
file's own updated header comment for why (a real module-system
mismatch, not a mechanical no-op).

## 6. Dev-only RS256 keypair committed to `.env.example`

`apps/api/.env.example` now ships a real, working, but deliberately
**publicly known** 2048-bit RS256 keypair for `JWT_PRIVATE_KEY`/
`JWT_PUBLIC_KEY`, generated and sign/verify-tested with `openssl`/Node's
`crypto` module during this build. This was a judgment call to keep
`./scripts/setup.sh`'s "one command, everything works" promise intact —
without it, a fresh clone would boot but every register/login call would
fail on an invalid PEM the first time anyone actually exercised the new
endpoints. It is loudly commented at the point of use (never use outside
local dev; regeneration instructions included) and is exactly as safe as
any other placeholder value in this file, precisely because it's already
public. Flagging the *pattern* itself (committing a real, working secret
value, even a deliberately-public one) for Erwin's confirmation it's
acceptable, since it's a judgment call this delivery made rather than
something the governing documents specify either way.

## 7. Build verification

No network access was available in the environment this was built in, so
`pnpm install` (and therefore `prisma generate`, `eslint`, `jest`, a real
`tsc` against the actual configured `tsconfig.json`) could not be run
against the real registry — the same constraint FE-01's and BE-01's own
delivery notes recorded. What was done instead, and why it's reasonably
trustworthy despite that constraint, is recorded in full in
`apps/api/README.md`'s "Verification status" section: a filtered
`tsc --noEmit` pass across every new/modified file; an isolated
reproduction (with a hand-written minimal `zod`-shaped type stub) that
confirmed the two errors that looked substantive were actually artifacts
of `zod`/`@prisma/client` being unresolvable in this sandbox, not real
bugs; a from-scratch reconstruction of the `import/order` ESLint rule's
actual grouping behavior (verified against the one real precedent
already in this repo, `apps/web/lib/api.ts`) applied programmatically
across all 26 touched files; and a disposable RSA keypair generated and
round-trip-verified with Node's own `crypto` module for the unit tests
that need one.

**Before merging, please run for real** (this could not be done here):

```bash
pnpm install
pnpm --filter @talentswap/api prisma generate
pnpm --filter @talentswap/api prisma migrate dev
pnpm --filter @talentswap/api run typecheck
pnpm --filter @talentswap/api run lint
pnpm --filter @talentswap/api test
pnpm --filter @talentswap/api run test:e2e   # requires Postgres/Redis up — see infrastructure/docker
```

## 8. Files touched outside `src/modules/auth/`

Every change outside the new module folder is additive or a documented
minimal compatibility fix, never a redesign, per this task's own "STOP
and identify the conflict... do not silently redesign the system"
instruction:

| File | Change |
|---|---|
| `packages/types/src/{auth.types.ts,index.ts}` | New domain file + barrel export |
| `packages/validation/src/{auth.schema.ts,index.ts}` | New domain file + barrel export |
| `apps/api/package.json` | New deps (`bcrypt`, `@nestjs/jwt`, `passport-jwt`, `cookie-parser`, workspace packages), jest `moduleNameMapper` additions |
| `apps/api/tsconfig.json` | `paths` additions for the two workspace packages |
| `apps/api/.env.example` | New `JWT_*`/`REFRESH_TOKEN_*`/`BCRYPT_*`/`SEED_ADMIN_*` vars |
| `apps/api/src/config/{env.schema.ts,configuration.ts}` | Additive `AuthConfig` + `normalizePem()`, per this file's own documented extension pattern |
| `apps/api/src/common/enums/role.enum.ts` | Now re-exports from `@talentswap/types` (closes its own flagged TODO) |
| `apps/api/src/common/interfaces/authenticated-request.interface.ts` | `AuthenticatedUser` now re-exported from `@talentswap/types` instead of declared locally |
| `apps/api/src/common/guards/jwt-auth.guard.ts` | Doc comment only — logic untouched |
| `apps/api/src/app.module.ts` | Imports `AuthModule`; registers `JwtAuthGuard`/`RolesGuard`/`RateLimitGuard` as global `APP_GUARD`s, exactly per this file's own prior comment block |
| `apps/api/src/main.ts` | Adds `cookie-parser` middleware; Swagger description no longer says "no domain endpoints yet" |
| `apps/api/prisma/schema.prisma` | New `// === auth module ===` block (`User`, `RefreshToken`, `UserRole`) |
| `apps/api/prisma/seed.ts` | New `// === auth module ===` section (optional admin bootstrap, env-gated) |
| `apps/api/package.json` scripts | Added `prisma:migrate:dev`/`prisma:migrate:deploy` (didn't exist — no models existed to migrate before now) |
| `apps/api/test/app.e2e-spec.ts` | One-line comment fix (a stale "no domain modules" note) — test behavior unchanged |
| `apps/api/README.md`, root `README.md` | Status/scope/verification sections updated |
| `docs/architecture/BE-CON-v1.0_Backend_Constitution.md` | Checked in — was referenced throughout the codebase but not previously present in this repository (root README's own flagged gap) |
