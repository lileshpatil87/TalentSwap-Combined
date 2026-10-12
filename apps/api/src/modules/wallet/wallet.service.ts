import { Inject, Injectable } from '@nestjs/common';
import type { LedgerEntryType, Prisma } from '@prisma/client';
import { WALLET_REPOSITORY } from './wallet.constants';
import type { WalletRepository, WalletTransactionClient } from './wallet.repository';
import { InsufficientBalanceException } from './wallet.exceptions';
import { TransactionHelper } from '@app/database/transaction.helper';

export interface LedgerAtomicContext {
  tx: WalletTransactionClient;
  hold(userId: string, amount: number, description: string, transactionId?: string): Promise<any>;
  credit(userId: string, amount: number, description: string, transactionId?: string): Promise<any>;
  debit(userId: string, amount: number, description: string, transactionId?: string): Promise<any>;
  release(userId: string, amount: number, description: string, transactionId?: string): Promise<any>;
}

@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY) private readonly repo: WalletRepository,
    private readonly txHelper: TransactionHelper,
  ) {}

  async getBalance(userId: string) {
    const [available, pending] = await Promise.all([this.repo.latestBalance(userId), this.repo.pendingEscrow(userId)]);
    return { balance: available + pending, available, pending, currencyLabel: 'Skill Points' };
  }

  async ledger(userId: string, page = 1, limit = 20) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const r = await this.repo.list(userId, safePage, safeLimit);
    return { ...r, page: safePage, limit: safeLimit, totalPages: Math.ceil(r.total / safeLimit) };
  }

  async credit(userId: string, amount: number, description: string, transactionId?: string, idempotencyKey?: string) { return this.apply(userId, 'CREDIT', amount, description, transactionId, idempotencyKey); }
  async debit(userId: string, amount: number, description: string, transactionId?: string) { return this.apply(userId, 'DEBIT', amount, description, transactionId); }
  async hold(userId: string, amount: number, description: string, transactionId?: string) { return this.apply(userId, 'ESCROW_HOLD', amount, description, transactionId); }
  async release(userId: string, amount: number, description: string, transactionId?: string) { return this.apply(userId, 'ESCROW_RELEASE', amount, description, transactionId); }
  async adminAdjustment(userId: string, amount: number, description: string) { return this.apply(userId, 'ADMIN_ADJUSTMENT', amount, description); }

  async withFinancialTransaction<T>(lockUserIds: string | string[], work: (ctx: LedgerAtomicContext) => Promise<T>): Promise<T> {
    const run = async (tx: Prisma.TransactionClient) => {
      const ctx: LedgerAtomicContext = {
        tx,
        hold: (userId, amount, description, transactionId) => this.applyInTransaction(tx, userId, 'ESCROW_HOLD', amount, description, transactionId),
        credit: (userId, amount, description, transactionId) => this.applyInTransaction(tx, userId, 'CREDIT', amount, description, transactionId),
        debit: (userId, amount, description, transactionId) => this.applyInTransaction(tx, userId, 'DEBIT', amount, description, transactionId),
        release: (userId, amount, description, transactionId) => this.applyInTransaction(tx, userId, 'ESCROW_RELEASE', amount, description, transactionId),
      };
      return work(ctx);
    };
    const options = { isolationLevel: 'Serializable' as const };
    return Array.isArray(lockUserIds)
      ? this.txHelper.withAdvisoryLocks(lockUserIds, run, options)
      : this.txHelper.withAdvisoryLock(lockUserIds, run, options);
  }

  private async apply(userId: string, type: LedgerEntryType, amount: number, description: string, transactionId?: string, idempotencyKey?: string) {
    this.validateAmount(amount);
    try { return await this.repo.mutate(userId, type, amount, description, transactionId, idempotencyKey); }
    catch (e) { if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') throw new InsufficientBalanceException(); throw e; }
  }

  private async applyInTransaction(tx: WalletTransactionClient, userId: string, type: LedgerEntryType, amount: number, description: string, transactionId?: string) {
    this.validateAmount(amount);
    try { return await this.repo.mutateInTransaction(tx, userId, type, amount, description, transactionId); }
    catch (e) { if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') throw new InsufficientBalanceException(); throw e; }
  }

  private validateAmount(amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) throw new RangeError('amount must be a positive integer');
  }
}
