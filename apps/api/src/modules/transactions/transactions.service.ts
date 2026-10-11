import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletService } from '../wallet/wallet.service';
import { SkillsService } from '../skills/skills.service';
import { UsersService } from '../users/users.service';
import { TRANSACTIONS_REPOSITORY, TRANSACTION_EVENTS } from './transactions.constants';
import { DuplicateTransactionException, InvalidTransactionStateException, TransactionNotFoundException, TransactionOwnershipException } from './transactions.exceptions';
import { PrismaTransactionsRepository } from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TRANSACTIONS_REPOSITORY) private readonly repo: PrismaTransactionsRepository,
    private readonly wallet: WalletService,
    private readonly skills: SkillsService,
    private readonly users: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  async create(initiatorId: string, input: any) {
    await this.users.assertActive(initiatorId);
    const provider = await this.users.assertActive(input.providerId);
    if (provider.id === initiatorId) throw new TransactionOwnershipException();
    const skill = await this.skills.get(input.skillId);
    if (skill.userId !== provider.id) throw new TransactionOwnershipException();
    const deadline = input.confirmationDeadline ?? new Date(Date.now() + 48 * 60 * 60 * 1000);

    const tx = await this.wallet.withFinancialTransaction(initiatorId, async (ledger) => {
      const existing = await this.repo.findByIdempotencyKeyTx(ledger.tx, input.idempotencyKey);
      if (existing) throw new DuplicateTransactionException();
      const created = await this.repo.createTx(ledger.tx, {
        initiatorId,
        providerId: provider.id,
        skillId: skill.id,
        type: input.type,
        pointsHeld: input.pointsHeld,
        status: 'PENDING',
        confirmationDeadline: deadline,
        idempotencyKey: input.idempotencyKey,
        notes: input.notes,
      });
      await ledger.hold(initiatorId, input.pointsHeld, 'Escrow hold', created.id);
      return this.repo.updateTx(ledger.tx, created.id, { status: 'ESCROW_HELD' });
    });

    this.events.emit(TRANSACTION_EVENTS.ESCROW_FUNDED, {
      transactionId: tx.id, initiatorId, providerId: provider.id, points: input.pointsHeld,
    });
    return tx;
  }

  async get(id: string, actorId?: string) {
    const tx = await this.repo.findById(id);
    if (!tx) throw new TransactionNotFoundException(id);
    if (actorId && actorId !== tx.initiatorId && actorId !== tx.providerId) throw new TransactionOwnershipException();
    return tx;
  }

  async assertCompleted(id: string, actorId?: string) {
    const tx = await this.get(id, actorId);
    if (tx.status !== 'COMPLETED') throw new InvalidTransactionStateException();
    return tx;
  }

  async confirm(id: string, actorId: string) {
    const current = await this.get(id, actorId);
    const completed = await this.wallet.withFinancialTransaction(current.initiatorId, async (ledger) => {
      const tx = await this.repo.findByIdForUpdate(ledger.tx, id);
      if (!tx) throw new TransactionNotFoundException(id);
      if (actorId !== tx.initiatorId && actorId !== tx.providerId) throw new TransactionOwnershipException();
      if (!['ESCROW_HELD', 'PROVIDER_CONFIRMED', 'RECIPIENT_CONFIRMED'].includes(tx.status)) throw new InvalidTransactionStateException();

      const providerConfirmed = Boolean(tx.providerConfirmed || actorId === tx.providerId);
      const recipientConfirmed = Boolean(tx.recipientConfirmed || actorId === tx.initiatorId);
      if (providerConfirmed && recipientConfirmed) {
        await ledger.release(tx.providerId, tx.pointsHeld, 'Escrow release to provider', tx.id);
        return this.repo.updateTx(ledger.tx, id, {
          providerConfirmed: true,
          recipientConfirmed: true,
          status: 'COMPLETED',
          completedAt: new Date(),
        });
      }
      return this.repo.updateTx(ledger.tx, id, {
        providerConfirmed,
        recipientConfirmed,
        status: actorId === tx.providerId ? 'PROVIDER_CONFIRMED' : 'RECIPIENT_CONFIRMED',
      });
    });

    if (completed.status === 'COMPLETED') {
      this.events.emit(TRANSACTION_EVENTS.COMPLETED, {
        transactionId: completed.id, initiatorId: completed.initiatorId,
        providerId: completed.providerId, points: completed.pointsHeld,
      });
    } else {
      this.events.emit(TRANSACTION_EVENTS.CONFIRMED, { transactionId: completed.id, userId: actorId });
    }
    return completed;
  }

  async dispute(id: string, actorId: string, reason: string) {
    const current = await this.get(id, actorId);
    const updated = await this.wallet.withFinancialTransaction(current.initiatorId, async (ledger) => {
      const tx = await this.repo.findByIdForUpdate(ledger.tx, id);
      if (!tx) throw new TransactionNotFoundException(id);
      if (actorId !== tx.initiatorId && actorId !== tx.providerId) throw new TransactionOwnershipException();
      if (!['ESCROW_HELD', 'PROVIDER_CONFIRMED', 'RECIPIENT_CONFIRMED'].includes(tx.status)) throw new InvalidTransactionStateException();
      await ledger.release(tx.initiatorId, tx.pointsHeld, 'Escrow refund after dispute', tx.id);
      return this.repo.updateTx(ledger.tx, id, { status: 'DISPUTED', notes: reason });
    });
    this.events.emit(TRANSACTION_EVENTS.DISPUTED, {
      transactionId: id, initiatorId: updated.initiatorId, providerId: updated.providerId, reason,
    });
    return updated;
  }

  async escalateExpired(id: string) {
    const current = await this.get(id);
    if (current.confirmationDeadline > new Date()) return current;
    if (['COMPLETED', 'DISPUTED', 'CANCELLED'].includes(current.status)) return current;
    return this.dispute(id, current.initiatorId, 'Confirmation deadline expired');
  }

  statsForAdmin() { return this.repo.stats(); }
  flaggedForAdmin() { return this.repo.flagged(); }
  async history(userId: string, page = 1, limit = 20) {
    const r = await this.repo.history(userId, page, limit);
    return { ...r, page, limit, totalPages: Math.ceil(r.total / limit) };
  }
}
