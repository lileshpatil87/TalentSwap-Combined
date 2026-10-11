import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService, type HealthCheckResult } from './app.service';
import { Public } from './common/decorators/public.decorator';
import type { HealthIndicatorResult } from './database/database-health.indicator';

/**
 * Root-level infrastructure controller. Per Backend Constitution §8, a
 * controller method body is validation-binding + exactly one service call
 * + a return statement — nothing more. This is the only controller
 * Foundation (BE-01/FOUND scope) defines; every business resource
 * controller belongs to its own domain module under `modules/<domain>/`.
 *
 * All routes here are excluded from the versioned `/api/v1` prefix in
 * `main.ts` (`setGlobalPrefix(..., { exclude: ['health', 'health/(.*)'] })`)
 * — health checks are an infra-level contract, not a versioned business
 * resource, and are conventionally probed at a bare path.
 */
@ApiTags('health')
@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Liveness/readiness probe for container orchestration and uptime
   * monitoring (`DEPLOY-05`). Decorated `@Public()` since — per
   * Architecture Foundation §13 rule 3 — every route requires
   * authentication unless explicitly exempted, and a health check must be
   * reachable by an unauthenticated load balancer / monitor.
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregate liveness/readiness probe — checks API, database, and cache.',
  })
  async health(): Promise<HealthCheckResult> {
    return this.appService.checkHealth();
  }

  /** Granular database dependency check (added per 2026-08 integration review). */
  @Public()
  @Get('database')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Database-only liveness probe.' })
  async healthDatabase(): Promise<HealthIndicatorResult> {
    return this.appService.checkDatabase();
  }

  /** Granular Redis dependency check (added per 2026-08 integration review). */
  @Public()
  @Get('redis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redis-only liveness probe.' })
  async healthRedis(): Promise<HealthIndicatorResult> {
    return this.appService.checkRedis();
  }
}
