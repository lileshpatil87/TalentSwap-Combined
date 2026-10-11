import type { Request } from 'express';

import type { AuthenticatedUser } from '@talentswap/types';

export type { AuthenticatedUser } from '@talentswap/types';

/**
 * Minimal shape of the JWT payload once verified and attached to
 * `request.user` by `JwtStrategy` (`modules/auth/strategies/jwt.strategy.ts`,
 * BE-02). Re-exported here from `@talentswap/types` — see that package's
 * `auth.types.ts` doc comment — so foundation-level code (guards,
 * `@CurrentUser()`) can keep importing `AuthenticatedUser` from
 * `'../interfaces/authenticated-request.interface'` without depending on
 * the `auth` module directly; this interface still describes a
 * *contract*, not an implementation, it just now has a single canonical
 * definition shared with `apps/web` instead of a locally-duplicated one.
 */

/**
 * Express `Request`, extended with the fields the request lifecycle
 * attaches: `user` (post-authentication, via Passport) and `requestId`
 * (via `RequestIdMiddleware`, attached on every request regardless of
 * auth state).
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  requestId: string;
}
