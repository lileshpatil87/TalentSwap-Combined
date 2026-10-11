import { Injectable } from '@nestjs/common';

import { CacheService } from './cache.service';
import type { HealthIndicatorResult } from '../database/database-health.indicator';

/**
 * Redis counterpart to `DatabaseHealthIndicator` — same rationale, same
 * result shape, so `/health/database` and `/health/redis` are consistent
 * for whatever dashboard or uptime monitor consumes them.
 */
@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly cache: CacheService) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    const ok = await this.cache.ping();

    return ok
      ? { status: 'up', latencyMs: Date.now() - start }
      : { status: 'down', error: 'PING did not return PONG' };
  }
}
