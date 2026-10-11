/**
 * Authentication & authorization types shared by apps/web and apps/api
 * (Arch §2.3, §5.2). Introduced by BE-02 (Authentication Foundation).
 *
 * This is the single source of truth for the `Role` enum and the shape of
 * an authenticated user as seen by API consumers. Neither app may
 * redeclare these locally (Arch §5.2, BE-CON §19/§20):
 *
 *  - `apps/api/src/common/enums/role.enum.ts` re-exports `Role` from here.
 *  - `apps/api/src/common/interfaces/authenticated-request.interface.ts`
 *    re-exports `AuthenticatedUser` from here.
 *  - The Prisma-generated `UserRole` enum (apps/api/prisma/schema.prisma,
 *    `auth` module block) uses the exact same member names, so its
 *    generated runtime string values already equal `Role`'s values
 *    without any conversion — see the schema's own doc comment for the
 *    full rationale (BE-CON §19: backend enums mirror their Prisma
 *    counterpart 1:1 in name AND member set).
 */

/**
 * Platform-wide role, owned exclusively by the `users` domain module
 * (Arch §3.1) but consumed everywhere authorization decisions are made —
 * `auth` assigns the default role at registration, `users` is the only
 * module permitted to change it thereafter.
 *
 * Member names are UPPER_SNAKE_CASE per Arch §5.2. Technology
 * Specification §4.1.1 documents this column's illustrative values in
 * lowercase (`user` | `verified_user` | ...); this uppercase casing is a
 * deliberate, documented reconciliation with the Prisma enum — see the
 * `// === auth module ===` block in `apps/api/prisma/schema.prisma`.
 */
export enum Role {
  USER = "USER",
  VERIFIED_USER = "VERIFIED_USER",
  MODERATOR = "MODERATOR",
  ADMIN = "ADMIN",
}

/**
 * The user identity carried in a validated JWT access token and exposed
 * as `request.user` on every authenticated request (Arch §9.6). This is
 * intentionally minimal — it is decoded from the token without a
 * database round-trip (Spec §2.2.4), so it carries only what the token
 * itself asserts, never profile/wallet/reputation data owned by other
 * modules.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Response body returned by `POST /auth/register`, `POST /auth/login`,
 * and `POST /auth/refresh`. The refresh token itself is never present in
 * this body — it travels exclusively as an httpOnly, Secure cookie
 * (Spec §3.6, §8.2) and is therefore not part of this shared type.
 */
export interface AuthSessionResponse {
  user: AuthenticatedUser;
  accessToken: string;
  /** Seconds until `accessToken` expires, for client-side refresh scheduling. */
  accessTokenExpiresIn: number;
}
