import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from './cache.constants';

/**
 * The only module-facing entry point to Redis (Architecture Foundation
 * §4.4, Backend Constitution §41): "Only `cache` module holds the Redis
 * client. Domain modules use `CacheService.get/set/del` ... — no module
 * instantiates its own `ioredis` client."
 *
 * Per Architecture Foundation §14 / Backend Constitution §41: this wraps
 * *cache* reads only — expensive aggregate reads (leaderboards, category
 * aggregations, platform stats), TTL 5–60 min. Transactional/ledger reads
 * are never cached here; that rule is enforced by the `wallet`/`transactions`
 * modules not calling this service for those paths, not by anything in
 * this class.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly subscriber: Redis;
  private readonly subscriptions = new Map<string, (payload: string) => void>();
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {
    this.subscriber = client.duplicate();
    this.subscriber.on('message', (channel: string, payload: string) => this.subscriptions.get(channel)?.(payload));
  }

  async get<T = string>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);

    if (raw === null) {
      return null;
    }

    return this.tryParseJson<T>(raw);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Atomic fixed-window counter increment, the primitive
   * `RateLimitGuard` (common/guards) builds on. Returns the counter's
   * value *after* incrementing. The key's TTL is (re)set only on the
   * first increment of a window, so the window slides correctly.
   */
  async incrementWithWindow(key: string, windowSeconds: number): Promise<number> {
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return count;
  }

  async sortedSetAdd(key:string,score:number,member:string):Promise<void>{await this.client.zadd(key,score,member);}
  async sortedSetRangeDesc(key:string,start:number,stop:number):Promise<string[]>{return this.client.zrevrange(key,start,stop);}
  async sortedSetCount(key:string):Promise<number>{return this.client.zcard(key);}
  async sortedSetRemove(key:string,member:string):Promise<void>{await this.client.zrem(key,member);}


  async publish(channel: string, payload: unknown): Promise<void> {
    await this.client.publish(channel, JSON.stringify(payload));
  }

  async subscribe(channel: string, handler: (payload: string) => void): Promise<void> {
    this.subscriptions.set(channel, handler);
    await this.subscriber.subscribe(channel);
  }

  async ping(): Promise<boolean> {
    try {
      const reply = await this.client.ping();
      return reply === 'PONG';
    } catch (error) {
      this.logger.warn(`Redis ping failed: ${(error as Error).message}`);
      return false;
    }
  }

  private tryParseJson<T>(raw: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Value was stored as a plain string (e.g. via `set(key, 'a string')`).
      return raw as unknown as T;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }
}
