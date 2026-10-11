# FE-02 — Application Layout & Navigation Foundation — Delivery Notes

Mirrors the discipline `docs/frontend/FE-01-delivery-notes.md` established:
flag conflicts and judgment calls explicitly rather than silently
resolving them. Read alongside that document.

---

## 1. Why `middleware.ts` and real auth/role gating are still not shipped

The task brief lists "Authenticated application layout foundation" as
in-scope but explicitly excludes "Authentication functionality." This
module resolves that tension the same way FE-01 already did for the
`(auth)` route group and `authStore`: it builds the **shell** a logged-in
user sees (`(dashboard)`/`(admin)` layouts, Sidebar, Navbar, UserNav
placeholder) without building the **enforcement** that only a logged-in
user reaches it.

Concretely, `apps/web/middleware.ts` (named in Architecture §15's tree)
is **not** included in this delivery. Two reasons, not one:

1. **Scope.** Its entire job is auth-gating — checking a session and
   redirecting — which is squarely "Authentication functionality."
2. **It would make this module's own deliverable untestable.** No Auth
   module exists yet, so there is no real session cookie to check. A
   middleware that redirects unauthenticated visitors away from
   `(dashboard)`/`(admin)` would send every visitor to `/login`, which
   has no page yet either (Auth UI's scope, per Master Plan `FE-01`) —
   producing a redirect into a 404 and making it impossible to actually
   view the shell this module built. That directly conflicts with the
   task's own Validation section ("Verify layouts render correctly,"
   "Verify navigation works").

The same reasoning applies to `(admin)`'s `Moderator`/`Admin` role check
(Frontend Constitution §6) — not implemented, for the identical reason.

**What *is* in place so the Auth module's own PR is small:** a fixed
`#main-content` landmark id, a single `AUTH_COOKIE`-style integration
point is intentionally *not* invented here (there's nothing to name yet
without knowing the Auth module's actual cookie/session shape) — the Auth
module adds `middleware.ts` against the route list already fixed in
`lib/navigation.ts` and the route groups already fixed in `app/`, without
needing to touch any file this module shipped.

---

## 2. Reusing Sidebar/Navbar/Footer inside `(admin)`

Frontend Constitution §7 states: *"The (dashboard) layout is the only
place Sidebar.tsx, Navbar.tsx, and Footer.tsx are composed."* Read
literally, that would forbid `(admin)/admin/layout.tsx` from importing
these components at all.

This module reads that sentence as describing the primary case the
Constitution had in view (chrome shouldn't leak into feature-module
layouts), not as a prohibition on the one other *route group* that is
equally part of the authenticated shell. The alternative — a parallel
`AdminSidebar.tsx`/`AdminNavbar.tsx` duplicating ~150 lines of identical
logic with a different `items` array — is exactly the kind of
duplication Architecture §10.2 (DRY) and Constitution §9 (promote a
component once two things need it) argue against.

**Flagging this for Erwin/John to confirm** rather than treating it as
settled: if the intended reading really is "these three files render
nowhere but `(dashboard)`," the fix is small — copy `Sidebar`/`Navbar`
into `(admin)`-specific files — but it should be a deliberate amendment,
not something a later session has to reverse-engineer from behavior.

---

## 3. Module ID mismatch

This task was labeled **FE-02**. The Master Development Plan (§3.5)
already assigns `FE-02` to **Profile UI** (`BE-02`/`BE-03` dependency),
and separately defines the scope actually requested here — dashboard
shell, navigation, route groups, auth-gating middleware — as **`FE-16`,
"Dashboard Shell & Navigation."**

This is the same class of conflict `FE-01`'s delivery notes flagged for
its own label (§2 of that document, re: `FE-01` = "Shared Frontend
Foundation" vs. the Master Plan's `FE-01` = "Auth UI"). Per this
project's own instruction to identify conflicts rather than silently
redesign around them: **the work in this delivery is `FE-16`'s scope**,
tracked under the task's given label of `FE-02` for this session only.
Recommend Jacob reconcile the two numbering schemes in the Module
Tracking Table (Master Plan §7.2) before further sessions compound the
drift — at minimum, `(dashboard)`/`(admin)` route content built by future
sessions should cite `FE-16` in their scope, not `FE-02`.

A second-order effect: because the *real* `FE-02` (Profile UI) hasn't
been built, `app/(dashboard)/profile/page.tsx` in this delivery is a
placeholder (§4 below), not an early implementation of Profile UI.

---

## 4. Sixteen placeholder pages — what they are and are not

Every top-level Sidebar/MobileNav destination now resolves to a real
page inside the shell, instead of exiting the shell into the bare root
`not-found.tsx` (a genuine Next.js App Router limitation: an unmatched
route bubbles to the nearest `not-found.tsx`, which for a route with no
`page.tsx` at all is the *root* one, outside any route group's layout —
so without these, clicking "Skills" in the sidebar would have dropped
the visitor out of the shell entirely, undermining "verify navigation
works").

Each placeholder is intentionally minimal: a `PageHeader` + one
`EmptyState` block, reusing FE-01's existing primitives, naming which
future module (by Master Plan ID) replaces it. Zero data fetching, zero
forms, zero business logic — the same content-free spirit as FE-01's own
`components/features/<module>/index.ts` barrel placeholders, just at the
route level instead of the component level.

**Files, one per route, each carrying its own "replaced by `FE-xx`"
comment:**

`app/(dashboard)/dashboard/page.tsx` (shell's own home — see below),
`discover/page.tsx` (`FE-04`), `skills/page.tsx` (`FE-03`),
`exchanges/page.tsx` (`FE-06`), `wallet/page.tsx` (`FE-05`),
`messages/page.tsx` (`FE-08`), `community/page.tsx` (`FE-12`),
`gamification/page.tsx` (`FE-10`), `profile/page.tsx` (real `FE-02` per
§3 above), `documents/page.tsx` (`FE-11`), `settings/page.tsx` (claimed
by this module — see below); `app/(admin)/admin/page.tsx`,
`users/page.tsx`, `documents/page.tsx`, `transactions/page.tsx`,
`analytics/page.tsx` (all `FE-14`/`BE-17`).

**Two routes this module claims as its own content, not placeholders for
someone else:**
- `(dashboard)/dashboard/page.tsx` — Architecture §15 reserves this path
  without assigning it to any domain module in the Master Plan's list.
  Since this module already owns the shell around it, it claims the
  landing view too (a welcome heading + quick links to the other nav
  destinations) rather than leaving it as a dead placeholder no module is
  responsible for.
- `(dashboard)/settings/page.tsx` — same situation: reserved in
  Architecture §15's tree, not owned by any `FE-xx` in the Master Plan's
  module list (`notifications`/`security` sub-tabs presumably belong to
  the Notifications/Auth modules respectively when built, but the
  top-level settings *page* itself has no owner). Claimed here for the
  same reason.

---

## 5. New `components/ui/` primitives and why they qualify

Seven new files: `sheet.tsx`, `dropdown-menu.tsx`, `avatar.tsx`,
`separator.tsx` (all direct Radix-based shadcn/ui primitives — qualify
under Constitution §9's "or if it's a direct shadcn/ui primitive"
clause), plus `theme-toggle.tsx`, `page-container.tsx`, `page-header.tsx`
(generic, feature-agnostic composites, the same category EmptyState/
ErrorState already occupy).

New dependencies added to `apps/web/package.json`:
`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`,
`@radix-ui/react-avatar`, `@radix-ui/react-separator`. No devDependency
was needed for the Sheet/DropdownMenu open/close animations —
`tailwindcss-animate` was already installed by FE-01.

---

## 6. `components/layouts/` grew from 3 files to 5

Architecture §15's tree and this project's own README (before this
delivery) named exactly `Sidebar.tsx`, `Navbar.tsx`, `Footer.tsx`. This
delivery adds `MobileNav.tsx` (Navbar's own mobile-breakpoint navigation
surface — without it, "Mobile navigation foundation," an explicit task
requirement, has nowhere compliant to live) and `UserNav.tsx` (the top
bar's account-menu slot, factored out of `Navbar.tsx` for readability).
Both are still app-shell chrome, not feature UI — see the folder's
updated `README.md` for the same reasoning stated in-repo.

---

## 7. Named exports vs. Frontend Constitution §19

FE-CON §19 states React components use a **default** export matching the
filename. Every component FE-01 actually shipped (`Button`, `Skeleton`,
`EmptyState`, `ErrorState`) uses a **named** export instead. This is a
real conflict between the written standard and the established
codebase — flagged per this task's own instruction ("if an existing
implementation conflicts with an approved architecture document, identify
the conflict before changing it"). This delivery follows the **existing
codebase's** convention (named exports) throughout, for consistency with
what's already shipped, rather than silently reformatting FE-01's four
files to match the written rule. Recommend John either amend §19 to match
practice or have a future session normalize the four existing files —
not both changed piecemeal by whoever notices next.

---

## 8. Prettier `singleQuote: true` vs. double-quoted existing code

Both `.prettierrc.js` (root) and `apps/api/.prettierrc.json` specify
`singleQuote: true`, but every `apps/web` file FE-01 shipped uses double
quotes throughout. Same category of conflict as §7 — followed the
existing file convention (double quotes) for all new files rather than
unilaterally reformatting ~20 existing files as a side effect of a
navigation task. Flagging for Krushna/John to reconcile the config
against actual practice.

---

## 9. Validation performed, and its limits

No network access and no `node_modules` were available in the
environment this was built in (same constraint FE-01's own notes
recorded) — `pnpm install`, real `tsc --noEmit`, `eslint`, and `jest`
could not be run.

What was done instead:
- Every new/changed file was read back and manually reviewed against
  Frontend Constitution naming, import-order, and design-token rules.
- A syntax-level pass with a globally-available standalone `tsc` (no
  module resolution) was run across all 44 new/changed files, to catch
  outright parse errors independent of missing dependencies.
- The residual errors from that pass (`Cannot find module`, JSX-runtime
  errors, implicit-`any` on destructured/selector params, and a false
  "Property 'key' does not exist" report) were cross-checked against the
  **same** degraded check run on FE-01's own existing, presumably-correct
  files (`button.tsx`, `empty-state.tsx`, `skeleton.tsx`, `uiStore.ts`) —
  they produce the identical class of noise, confirming these are
  artifacts of the missing-dependency environment, not defects in this
  module's code. The `key`-prop false positive was additionally
  reproduced in isolation with a minimal, textbook-correct
  `<Item key={x} .../>` snippet to rule out a real bug.
- Grepped every new file for `exactOptionalPropertyTypes`-risk patterns
  (the exact bug class MERGE_NOTES.md flags for `lib/api.ts`), unused
  imports, raw hex colors, non-semantic Tailwind color utilities, and
  arbitrary bracket spacing/sizing values — all clean after two rounds of
  fixes (the second round removed `size-[18px]`/`text-[10px]`/`w-[68px]`
  in favor of `size-4`/`text-xs`/`w-16`, the nearest on-scale tokens).

**What this does not replace:** an actual `pnpm install && pnpm --filter
web typecheck && pnpm --filter web lint && pnpm --filter web test` run in
an environment with registry access. That should be the first thing run
against this delivery before it's treated as `Approved`.

---

## 10. Files created (44)

```
apps/web/lib/navigation.ts
apps/web/lib/navigation.test.ts
apps/web/components/ui/page-container.tsx
apps/web/components/ui/page-header.tsx
apps/web/components/ui/page-header.test.tsx
apps/web/components/ui/separator.tsx
apps/web/components/ui/avatar.tsx
apps/web/components/ui/dropdown-menu.tsx
apps/web/components/ui/sheet.tsx
apps/web/components/ui/theme-toggle.tsx
apps/web/components/ui/theme-toggle.test.tsx
apps/web/components/layouts/Sidebar.tsx
apps/web/components/layouts/Sidebar.test.tsx
apps/web/components/layouts/MobileNav.tsx
apps/web/components/layouts/MobileNav.test.tsx
apps/web/components/layouts/Navbar.tsx
apps/web/components/layouts/Footer.tsx
apps/web/components/layouts/UserNav.tsx
apps/web/app/(dashboard)/layout.tsx
apps/web/app/(dashboard)/loading.tsx
apps/web/app/(dashboard)/error.tsx
apps/web/app/(dashboard)/dashboard/page.tsx
apps/web/app/(dashboard)/discover/page.tsx
apps/web/app/(dashboard)/skills/page.tsx
apps/web/app/(dashboard)/exchanges/page.tsx
apps/web/app/(dashboard)/wallet/page.tsx
apps/web/app/(dashboard)/messages/page.tsx
apps/web/app/(dashboard)/community/page.tsx
apps/web/app/(dashboard)/gamification/page.tsx
apps/web/app/(dashboard)/profile/page.tsx
apps/web/app/(dashboard)/documents/page.tsx
apps/web/app/(dashboard)/settings/page.tsx
apps/web/app/(admin)/admin/layout.tsx
apps/web/app/(admin)/admin/loading.tsx
apps/web/app/(admin)/admin/error.tsx
apps/web/app/(admin)/admin/page.tsx
apps/web/app/(admin)/admin/users/page.tsx
apps/web/app/(admin)/admin/documents/page.tsx
apps/web/app/(admin)/admin/transactions/page.tsx
apps/web/app/(admin)/admin/analytics/page.tsx
apps/web/app/(public)/layout.tsx
apps/web/app/(public)/page.tsx
apps/web/app/error.tsx
apps/web/app/global-error.tsx
docs/frontend/FE-CON-v1.0_Frontend_Constitution.md   (checked in, was previously only referenced — see MERGE_NOTES.md §4)
```

## Files modified

```
apps/web/package.json               (+4 Radix dependencies)
apps/web/components/layouts/README.md  (rewritten — was a "not yet built" placeholder)
README.md                           (root — status line updated)
```

## Files intentionally not touched

`apps/web/app/layout.tsx`, `apps/web/app/providers.tsx`,
`apps/web/app/not-found.tsx`, `apps/web/store/uiStore.ts`, everything
under `apps/api/`, `packages/`, `infrastructure/`, `prisma/` — no changes
were needed to any of these for this module's scope.
