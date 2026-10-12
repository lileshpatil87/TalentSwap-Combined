import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
    if (skill.userId !== provider.id || skill.type !== 'OFFERING') throw new TransactionOwnershipException();
    if (!Number.isInteger(skill.pointRate) || skill.pointRate <= 0 || input.pointsHeld !== skill.pointRate) {
      throw new BadRequestException('The held SkillPoints must match the current server-side rate for this skill.');
    }
    const now = Date.now();
    const deadline = input.confirmationDeadline ?? new Date(now + 48 * 60 * 60 * 1000);
    if (deadline.getTime() <= now || deadline.getTime() > now + 30 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('The confirmation deadline must be in the next 30 days.');
    }

    const tx = await this.wallet.withFinancialTransaction([initiatorId, provider.id], async (ledger) => {
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
    await this.users.assertActive(actorId);
    const current = await this.get(id, actorId);
    const completed = await this.wallet.withFinancialTransaction([current.initiatorId, current.providerId], async (ledger) => {
      const tx = await this.repo.findByIdForUpdate(ledger.tx, id);
      if (!tx) throw new TransactionNotFoundException(id);
      if (actorId !== tx.initiatorId && actorId !== tx.providerId) throw new TransactionOwnershipException();
      if (!['ESCROW_HELD', 'PROVIDER_CONFIRMED', 'RECIPIENT_CONFIRMED'].includes(tx.status)) throw new InvalidTransactionStateException();
      if (tx.confirmationDeadline <= new Date()) {
        return this.repo.updateTx(ledger.tx, id, { status: 'DISPUTED', notes: [tx.notes, 'Dispute: confirmation deadline expired'].filter(Boolean).join('\n\n').slice(-5000) });
      }

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
    } else if (completed.status === 'DISPUTED') {
      this.events.emit(TRANSACTION_EVENTS.DISPUTED, { transactionId: completed.id, initiatorId: completed.initiatorId, providerId: completed.providerId, reason: 'Confirmation deadline expired' });
    } else {
      this.events.emit(TRANSACTION_EVENTS.CONFIRMED, { transactionId: completed.id, userId: actorId });
    }
    return completed;
  }

  async dispute(id: string, actorId: string, reason: string) {
    await this.users.assertActive(actorId);
    const current = await this.get(id, actorId);
    const updated = await this.wallet.withFinancialTransaction([current.initiatorId, current.providerId], async (ledger) => {
      const tx = await this.repo.findByIdForUpdate(ledger.tx, id);
      if (!tx) throw new TransactionNotFoundException(id);
      if (actorId !== tx.initiatorId && actorId !== tx.providerId) throw new TransactionOwnershipException();
      if (!['ESCROW_HELD', 'PROVIDER_CONFIRMED', 'RECIPIENT_CONFIRMED'].includes(tx.status)) throw new InvalidTransactionStateException();
      return this.repo.updateTx(ledger.tx, id, { status: 'DISPUTED', notes: [tx.notes, `Dispute: ${reason}`].filter(Boolean).join('\n\n').slice(-5000) });
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

  async resolveDispute(id: string, outcome: 'REFUND_INITIATOR' | 'PAY_PROVIDER', reason: string) {
    if (!reason || reason.trim().length < 10 || reason.trim().length > 2000) {
      throw new BadRequestException('A dispute resolution reason between 10 and 2000 characters is required.');
    }
    const current = await this.get(id);
    const resolved = await this.wallet.withFinancialTransaction([current.initiatorId, current.providerId], async (ledger) => {
      const tx = await this.repo.findByIdForUpdate(ledger.tx, id);
      if (!tx) throw new TransactionNotFoundException(id);
      if (tx.status !== 'DISPUTED') throw new InvalidTransactionStateException();
      const recipientId = outcome === 'REFUND_INITIATOR' ? tx.initiatorId : tx.providerId;
      const status = outcome === 'REFUND_INITIATOR' ? 'CANCELLED' : 'COMPLETED';
      await ledger.release(recipientId, tx.pointsHeld, outcome === 'REFUND_INITIATOR' ? 'Dispute resolved: escrow refunded to initiator' : 'Dispute resolved: escrow released to provider', tx.id);
      const resolutionNote = `Dispute resolution (${outcome}): ${reason.trim()}`;
      const notes = [tx.notes, resolutionNote].filter(Boolean).join('\n\n').slice(-5000);
      return this.repo.updateTx(ledger.tx, id, { status, notes, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) });
    });
    if (resolved.status === 'COMPLETED') {
      this.events.emit(TRANSACTION_EVENTS.COMPLETED, { transactionId: resolved.id, initiatorId: resolved.initiatorId, providerId: resolved.providerId, points: resolved.pointsHeld });
    }
    return resolved;
  }

  statsForAdmin() { return this.repo.stats(); }
  flaggedForAdmin() { return this.repo.flagged(); }
  async history(userId: string, page = 1, limit = 20) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const r = await this.repo.history(userId, safePage, safeLimit);
    const statusMap: Record<string, string> = {
      PENDING: 'REQUESTED', ESCROW_HELD: 'IN_ESCROW', PROVIDER_CONFIRMED: 'AWAITING_CONFIRMATION',
      RECIPIENT_CONFIRMED: 'AWAITING_CONFIRMATION', COMPLETED: 'COMPLETED', DISPUTED: 'DISPUTED', CANCELLED: 'CANCELLED',
    };
    const items = r.items.map((tx: any) => {
      const other = tx.initiatorId === userId ? tx.provider : tx.initiator;
      const profile = other.profile;
      const name = profile?.displayName || other.email.split('@')[0] || 'TalentSwap member';
      return {
        id: tx.id, skillTitle: tx.skill?.title ?? 'Skill exchange',
        partner: { id: other.id, name, email: other.email, role: other.role, avatar: profile?.avatarUrl ?? undefined, headline: profile?.headline ?? undefined, location: profile?.location ?? undefined, rating: Number(profile?.reputationScore ?? 0), reviewCount: profile?.totalExchanges ?? 0, verified: profile?.isVerified ?? false },
        points: tx.pointsHeld, status: statusMap[tx.status] ?? 'REQUESTED',
        scheduledFor: tx.createdAt.toISOString(), updatedAt: (tx.completedAt ?? tx.createdAt).toISOString(),
      };
    });
    return { items, total: r.total, page: safePage, limit: safeLimit, totalPages: Math.ceil(r.total / safeLimit) };
  }
}
