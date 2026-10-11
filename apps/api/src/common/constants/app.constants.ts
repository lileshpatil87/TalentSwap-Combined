/**
 * App-wide constants shared across every backend module.
 * Business-specific constants (XP formulas, points-per-hour rates, etc.)
 * do NOT belong here — they belong to the module that owns that rule
 * (Architecture Foundation §1.3).
 */

/** Header carrying the per-request correlation ID (Backend Constitution §28). */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Pagination defaults (Architecture Foundation §9.3). */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Rate limit tiers, mirrored 1:1 from Backend Constitution §40 /
 * Technology Specification §5.4. Values are seconds (ttl) and request
 * count (limit). A module's controller opts into a tier via
 * `@RateLimit(RateLimitTier.AUTH)`; routes with no decorator fall back to
 * the STANDARD tier registered as the ThrottlerModule default.
 */
export const RATE_LIMIT_TIERS = {
  auth: { ttlSeconds: 15 * 60, limit: 5 },
  standard: { ttlSeconds: 60, limit: 200 },
  uploadPresign: { ttlSeconds: 60, limit: 10 },
  admin: { ttlSeconds: 60, limit: 50 },
} as const;

export type RateLimitTierName = keyof typeof RATE_LIMIT_TIERS;

/** Metadata keys used by shared decorators/guards/interceptors. */
export const METADATA_KEYS = {
  IS_PUBLIC: 'isPublic',
  ROLES: 'roles',
  RATE_LIMIT_TIER: 'rateLimitTier',
} as const;
