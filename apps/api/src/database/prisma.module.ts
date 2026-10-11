import { Global, Module } from '@nestjs/common';

import { DatabaseHealthIndicator } from './database-health.indicator';
import { PrismaService } from './prisma.service';
import { TransactionHelper } from './transaction.helper';

/**
 * Global database module — imported exactly once, in `AppModule`. Owns
 * `PrismaService`, `TransactionHelper`, and `DatabaseHealthIndicator`
 * (Architecture Foundation §3.1, §15). Domain modules inject any of
 * these directly; they never construct their own `PrismaClient` instance
 * or hand-roll transaction/advisory-lock/health-check logic.
 */
@Global()
@Module({
  providers: [PrismaService, TransactionHelper, DatabaseHealthIndicator],
  exports: [PrismaService, TransactionHelper, DatabaseHealthIndicator],
})
export class PrismaModule {}
