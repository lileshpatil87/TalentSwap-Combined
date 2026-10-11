import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';
import { TransactionHelper } from '@app/database/transaction.helper';
import type { Prisma } from '@prisma/client';

export type WalletTransactionClient = Prisma.TransactionClient;
export interface WalletRepository {
  latestBalance(userId: string): Promise<number>;
  list(userId: string, page: number, limit: number): Promise<{ items: any[]; total: number }>;
  mutate(userId: string, type: any, amount: number, description: string, transactionId?: string, idempotencyKey?: string): Promise<any>;
  mutateInTransaction(tx: WalletTransactionClient, userId: string, type: any, amount: number, description: string, transactionId?: string, idempotencyKey?: string): Promise<any>;
}

@Injectable()
export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: PrismaService, private readonly txHelper: TransactionHelper) {}

  async latestBalance(userId: string) {
    const row = await this.prisma.skillPointsLedger.findFirst({
      where: { userId }, orderBy: { createdAt: 'desc' }, select: { balanceAfter: true },
    });
    return row?.balanceAfter ?? 0;
  }

  async list(userId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.skillPointsLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.skillPointsLedger.count({ where: { userId } }),
    ]);
    return { items, total };
  }

  async mutate(userId: string, type: any, amount: number, description: string, transactionId?: string, idempotencyKey?: string) {
    return this.txHelper.withAdvisoryLock(userId, (tx) => this.mutateInTransaction(tx, userId, type, amount, description, transactionId, idempotencyKey), { isolationLevel: 'Serializable' });
  }

  async mutateInTransaction(tx: WalletTransactionClient, userId: string, type: any, amount: number, description: string, transactionId?: string, idempotencyKey?: string) {
    if (transactionId) {
      const existing = await tx.skillPointsLedger.findFirst({ where: { transactionId, entryType: type } });
      if (existing) return existing;
    }
    if (idempotencyKey) {
      const existing = await tx.skillPointsLedger.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }
    const last = await tx.skillPointsLedger.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { balanceAfter: true } });
    const balance = last?.balanceAfter ?? 0;
    const delta = type === 'CREDIT' || type === 'ESCROW_RELEASE' || type === 'ADMIN_ADJUSTMENT' ? amount : -amount;
    const next = balance + delta;
    if (next < 0) throw new Error('INSUFFICIENT_BALANCE');
    return tx.skillPointsLedger.create({
      data: {
        userId,
        transactionId: transactionId ?? null,
        idempotencyKey: idempotencyKey ?? null,
        entryType: type,
        amount,
        balanceAfter: next,
        description,
      },
    });
  }
}
