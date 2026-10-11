/**
 * Platform roles, mirrored 1:1 from Technology Specification §4.1.1
 * (`users.role` enum) and Backend Constitution §32.
 *
 * Canonical ownership of *assigning* a role belongs to the `users` module
 * (Backend Constitution §32) — this file re-exports the enum so
 * foundation-level guards (`RolesGuard`, `@Roles()`) can reference role
 * values before that module exists.
 *
 * BE-02 (Authentication Foundation) resolves the follow-up flagged by the
 * original version of this file: now that `packages/types` is stood up
 * and wired into `apps/api` (see `apps/api/tsconfig.json` `paths` and
 * `apps/api/package.json` dependencies), `Role` is defined exactly once
 * in `@talentswap/types` (Architecture Foundation §5.2 — "Enums used by
 * both apps/web and apps/api are defined once in packages/types") and
 * re-exported here so every existing import of
 * `'../enums/role.enum'` / `'./role.enum'` continues to resolve without
 * change. Do not redeclare `Role` locally again.
 */
export { Role } from '@talentswap/types';
