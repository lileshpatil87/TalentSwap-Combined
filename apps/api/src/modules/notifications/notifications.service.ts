import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATIONS_REPOSITORY } from './notifications.constants';
import { PrismaNotificationsRepository } from './notifications.repository';
import { RealtimeService } from '../../realtime/realtime.service';
import { QueueService } from '@app/cache/queue.service';
import { CacheService } from '@app/cache/cache.service';

export const NOTIFICATION_DELIVERED_CHANNEL = 'talentswap:notifications:delivered';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY) private readonly repo: PrismaNotificationsRepository,
    private readonly realtime: RealtimeService,
    private readonly queue: QueueService,
    private readonly cache: CacheService,
  ) {}

  async onModuleInit() {
    await this.cache.subscribe(NOTIFICATION_DELIVERED_CHANNEL, async (raw) => {
      try {
        const data = JSON.parse(raw) as { userId: string; notification: unknown };
        this.realtime.emitToUser(data.userId, 'notification:new', data.notification);
      } catch { /* malformed pub/sub payload is ignored */ }
    });
  }

  async create(input: any) { return this.repo.create(input); }

  async list(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([this.repo.list(userId, page, limit), this.repo.count(userId)]);
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async read(id: string, userId: string) { await this.repo.read(id, userId); return { id, read: true }; }
  async readAll(userId: string) { await this.repo.readAll(userId); return { readAll: true }; }

  @OnEvent('transaction.escrow_funded', { async: true })
  async onEscrow(e: any) { await this.enqueueForUsers([e.initiatorId, e.providerId], e); }

  @OnEvent('transaction.completed', { async: true })
  async onCompleted(e: any) { await this.enqueueForUsers([e.initiatorId, e.providerId], e); }

  @OnEvent('transaction.disputed', { async: true })
  async onDisputed(e: any) { await this.enqueueForUsers([e.initiatorId, e.providerId], e); }

  private async enqueueForUsers(userIds: string[], event: any) {
    for (const userId of [...new Set(userIds)]) {
      await this.queue.addJob('notifications', 'persist', {
        userId,
        type: 'TRANSACTION',
        payload: event,
      }, { jobId: `notification:${event.transactionId}:${event.event ?? event.type ?? 'event'}:${userId}` });
    }
  }
}
