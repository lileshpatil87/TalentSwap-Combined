import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CacheService } from '../../cache/cache.service';
import { RATE_LIMIT_TIERS, type RateLimitTierName } from '../constants/app.constants';
import { RATE_LIMIT_TIER_KEY } from '../decorators/rate-limit.decorator';
import { DomainException } from '../exceptions/domain.exception';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

class RateLimitExceededException extends DomainException {
  public readonly code = 'RATE_LIMIT_EXCEEDED';

  constructor(retryAfterSeconds: number) {
    super('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS, {
      retryAfterSeconds,
    });
  }
}

/**
 * Decorator-driven, tier-based rate limiting (Backend Constitution §40),
 * implemented once here and applied globally as `APP_GUARD` — no module
 * re-implements its own inline rate limiting (Architecture Foundation §13
 * rule 4).
 *
 * Deliberately implemented as a plain fixed-window Redis counter via
 * `CacheService.incrementWithWindow()` rather than wrapping a third-party
 * throttling library: it needs nothing beyond an atomic increment + TTL,
 * the primitive `CacheService` already exposes, and keeps the whole
 * rate-limiting policy (tiers, tracking key, response shape) in one
 * reviewable place.
 *
 * Tracking key is per-user for authenticated requests (so users behind a
 * shared/office IP don't share a bucket) and per-IP otherwise (login,
 * registration, and other pre-auth `auth` tier routes).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tierName = this.reflector.getAllAndOverride<RateLimitTierName | undefined>(
      RATE_LIMIT_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const tier = RATE_LIMIT_TIERS[tierName ?? 'standard'];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tracker = request.user?.id ?? request.ip ?? 'unknown';

    // Window key changes every `ttlSeconds` so the counter resets cleanly
    // — a fixed window, not a sliding one; acceptable for this platform's
    // abuse-prevention purpose per Technology Specification §5.4.
    const windowBucket = Math.floor(Date.now() / (tier.ttlSeconds * 1000));
    const key = `ratelimit:${tierName ?? 'standard'}:${tracker}:${windowBucket}`;

    const count = await this.cache.incrementWithWindow(key, tier.ttlSeconds);

    if (count > tier.limit) {
      throw new RateLimitExceededException(tier.ttlSeconds);
    }

    return true;
  }
}
