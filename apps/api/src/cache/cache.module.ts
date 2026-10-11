import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { BULLMQ_CONNECTION, REDIS_CLIENT } from './cache.constants';
import { CacheService } from './cache.service';
import { QueueService } from './queue.service';
import { RedisHealthIndicator } from './redis-health.indicator';
import type { RedisConfig } from '../config/configuration';

/**
 * Global cache/queue module — imported exactly once, in `AppModule`.
 * Owns the single shared `ioredis` client (Architecture Foundation §4.4)
 * that `CacheService` and `QueueService` (BullMQ) both build on.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const redis = configService.get<RedisConfig>('redis');
        return new Redis(redis!.url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: BULLMQ_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis');
        return { url: redis!.url };
      },
    },
    CacheService,
    QueueService,
    RedisHealthIndicator,
  ],
  exports: [CacheService, QueueService, RedisHealthIndicator],
})
export class CacheModule {}
