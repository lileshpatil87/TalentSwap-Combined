import { SetMetadata } from '@nestjs/common';

import { METADATA_KEYS, type RateLimitTierName } from '../constants/app.constants';

export const RATE_LIMIT_TIER_KEY = METADATA_KEYS.RATE_LIMIT_TIER;

/**
 * Opts a route into a named rate-limit tier (Backend Constitution §40).
 * Consumed by `RateLimitGuard` (common/guards — registered as a global
 * `APP_GUARD` in `app.module.ts`), which resolves the tier's ttl/limit
 * from `RATE_LIMIT_TIERS` in `app.constants.ts`.
 *
 * Routes with no `@RateLimit(...)` decorator fall back to the `standard`
 * tier. This is implemented once, here, per Architecture Foundation §13
 * rule 4 — no module re-implements its own inline rate limiting.
 *
 * Usage: `@RateLimit('auth')` on the login/register/forgot-password routes.
 */
export const RateLimit = (tier: RateLimitTierName): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_TIER_KEY, tier);
