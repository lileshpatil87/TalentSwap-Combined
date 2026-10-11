import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

type IsolationLevel = 'ReadCommitted' | 'Serializable';

@Injectable()
export class TransactionHelper {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: IsolationLevel; timeoutMs?: number; retries?: number },
  ): Promise<T> {
    const retries = options?.retries ?? (options?.isolationLevel === 'Serializable' ? 3 : 0);
    for (let attempt = 0; ; attempt += 1) {
      try {
        const txOptions: { isolationLevel?: Prisma.TransactionIsolationLevel; timeout?: number } = {};
        if (options?.isolationLevel) txOptions.isolationLevel = options.isolationLevel as Prisma.TransactionIsolationLevel;
        if (options?.timeoutMs !== undefined) txOptions.timeout = options.timeoutMs;
        return await (this.prisma.$transaction as any)(fn, txOptions);
      } catch (error) {
        if (!this.isRetryableSerializationFailure(error) || attempt >= retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
  }

  async withAdvisoryLock<T>(
    lockKey: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: IsolationLevel; timeoutMs?: number; retries?: number },
  ): Promise<T> {
    return this.withTransaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      return fn(tx);
    }, options);
  }

  private isRetryableSerializationFailure(error: unknown): boolean {
    const candidate = error as { code?: string; meta?: { code?: string }; message?: string };
    return candidate?.code === 'P2034'
      || candidate?.meta?.code === '40001'
      || candidate?.meta?.code === '40P01'
      || /serialization failure|deadlock detected|could not serialize access/i.test(candidate?.message ?? '');
  }
}
