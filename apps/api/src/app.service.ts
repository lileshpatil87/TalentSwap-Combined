import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisHealthIndicator } from './cache/redis-health.indicator';
import type { AppConfig } from './config/configuration';
import {
  DatabaseHealthIndicator,
  type HealthIndicatorResult,
} from './database/database-health.indicator';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  dependencies: {
    database: 'ok' | 'unreachable';
    redis: 'ok' | 'unreachable';
  };
}

/**
 * Backs the `GET /health` endpoint (`AppController`). Not a domain
 * module — this is Foundation-scope infrastructure so every future
 * module, uptime monitor (`DEPLOY-05`), and container orchestrator has a
 * single, reliable liveness/readiness signal from day one.
 *
 * The aggregate check delegates to `DatabaseHealthIndicator` /
 * `RedisHealthIndicator` (database/, cache/) rather than pinging each
 * dependency inline, so the aggregate `/health` route and the granular
 * `/health/database` / `/health/redis` routes (added per the 2026-08
 * integration review) share exactly one implementation each — no drift
 * between the two.
 */
@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.all([
      this.databaseHealth.check(),
      this.redisHealth.check(),
    ]);

    const app = this.configService.get<AppConfig>('app');

    return {
      status: database.status === 'up' && redis.status === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: app!.nodeEnv,
      dependencies: {
        database: database.status === 'up' ? 'ok' : 'unreachable',
        redis: redis.status === 'up' ? 'ok' : 'unreachable',
      },
    };
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    return this.databaseHealth.check();
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    return this.redisHealth.check();
  }
}
