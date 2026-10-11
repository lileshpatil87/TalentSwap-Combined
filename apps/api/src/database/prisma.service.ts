import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

import type { DatabaseConfig } from '../config/configuration';

/**
 * The single `PrismaService` instance (Architecture Foundation §3.1
 * `database` infrastructure module). Every domain module receives this
 * via injection but queries only the tables it owns (Architecture
 * Foundation §4.3, enforced by `scripts/check-boundaries.ts` in CI) —
 * this class itself has no opinion on ownership, it only owns the
 * connection lifecycle.
 *
 * The `auth` module (BE-02) was the first to add models
 * (`prisma/schema.prisma`'s `// === auth module ===` block), so
 * `this.prisma.user` / `this.prisma.refreshToken` are now real, typed
 * delegates once `prisma generate` has been run — exactly as this
 * comment previously anticipated. No change to this file was needed when
 * that happened, and none is needed for the next domain module either.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const database = configService.get<DatabaseConfig>('database');
    const nodeEnv = configService.get<string>('app.nodeEnv');

    super({
      datasources: { db: { url: database!.url } },
      log:
        nodeEnv === 'development'
          ? [
              { emit: 'event', level: 'warn' },
              { emit: 'event', level: 'error' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    // FOLLOW-UP (track against the first DB-xx module's PR): `$on`'s event
    // typing depends on the `log` array shape given to the PrismaClient
    // constructor and is awkward to satisfy strictly without a generated
    // client that has models. `as any` is scoped to these two lines only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('warn', (e: { message: string }) => this.logger.warn(e.message));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('error', (e: { message: string }) => this.logger.error(e.message));

    await this.$connect();
    this.logger.log('PostgreSQL connection established.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
