/**
 * DI token for the `auth` module's repository abstraction.
 *
 * Per Backend Constitution §21: "Where a service needs to depend on an
 * abstraction rather than a concrete class (e.g., a repository), the
 * interface is injected via a NestJS custom provider token, with the
 * Prisma-backed implementation bound in the module's providers array —
 * never a direct class reference that would prevent test-double
 * substitution." `AuthService` depends on the `AuthRepository` interface
 * (`auth.repository.ts`) via this token; `AuthModule` binds it to
 * `PrismaAuthRepository`. Unit tests bind it to a mock instead.
 */
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

/**
 * Winston logging context label (Backend Constitution §28) — passed as
 * the second argument to every `logger.log/warn/error(message, AUTH_LOG_CONTEXT)`
 * call in this module, so auth-related audit events (registration, login,
 * refresh rotation, family-reuse detection, logout) are greppable by a
 * single consistent context string rather than per-class names drifting
 * over time.
 */
export const AUTH_LOG_CONTEXT = 'AuthService';
