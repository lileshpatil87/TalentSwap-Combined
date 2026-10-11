import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue, type JobsOptions } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

import { BULLMQ_CONNECTION } from './cache.constants';

/**
 * Thin wrapper around BullMQ queue registration (Architecture Foundation
 * §15 `cache/queue.service.ts`, Backend Constitution §42). Domain modules
 * call `QueueService.registerQueue('document-scan')` once (typically in
 * their module's providers) and then `addJob(...)` — no module
 * instantiates its own BullMQ `Queue` or Redis connection directly.
 *
 * Queue *processors* (the worker side that consumes jobs) are owned by
 * the module whose queue it is (e.g. `documents/processors/document-scan.processor.ts`)
 * — this service only covers the producer side and queue lifecycle,
 * consistent with this being Foundation-scope infrastructure, not
 * business logic.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  constructor(@Inject(BULLMQ_CONNECTION) private readonly connection: ConnectionOptions) {}

  registerQueue(name: string): Queue {
    const existing = this.queues.get(name);

    if (existing) {
      return existing;
    }

    const queue = new Queue(name, { connection: this.connection });
    this.queues.set(name, queue);

    return queue;
  }

  async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<void> {
    const queue = this.registerQueue(queueName);

    await queue.add(jobName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
      ...opts,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
