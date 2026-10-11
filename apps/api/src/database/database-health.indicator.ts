import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma.service';

export interface HealthIndicatorResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

/**
 * Reusable database liveness check (added in response to the 2026-08
 * integration review, which flagged that the DB-01 delivery had a
 * dedicated `/health/database` route this Foundation build lacked).
 *
 * Deliberately a small hand-rolled indicator rather than pulling in
 * `@nestjs/terminus` — Foundation scope doesn't yet need a general
 * health-indicator framework, and this keeps the dependency footprint
 * minimal (Backend Constitution §1 KISS: "ships the simplest
 * implementation that satisfies its current sprint"). If a third
 * dependency (e.g. an external API health check) needs the same pattern
 * later, that's the trigger to introduce `@nestjs/terminus` for real.
 */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      return { status: 'down', error: (error as Error).message };
    }
  }
}
