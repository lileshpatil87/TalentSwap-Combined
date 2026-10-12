import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import { CallingRepository } from './calling.repository';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CallAccessException, CallNotFoundException } from './calling.exceptions';

@Injectable()
export class CallingService {
  constructor(private readonly repo: CallingRepository, private readonly users: UsersService, private readonly transactions: TransactionsService, private readonly config: ConfigService) {}

  async create(userId: string, transactionId: string) {
    const transaction = await this.transactions.get(transactionId, userId);
    if (!['ESCROW_HELD', 'PROVIDER_CONFIRMED', 'RECIPIENT_CONFIRMED'].includes(transaction.status)) throw new CallAccessException();
    const participantIds = [...new Set([transaction.initiatorId, transaction.providerId])];
    for (const id of participantIds) await this.users.assertActive(id);
    const existing = await this.repo.findActiveByTransactionId(transactionId);
    if (existing) {
      if (!existing.participantIds.includes(userId)) throw new CallAccessException();
      return this.withSfuCredentials(existing, userId);
    }
    try {
      const created = await this.repo.create({ initiatorId: userId, participantIds, transactionId, channelName: `call-${randomUUID()}`, status: 'RINGING' });
      return this.withSfuCredentials(created, userId);
    } catch (error) {
      // A partial unique index arbitrates simultaneous call creation. Reuse the winner.
      const concurrent = await this.repo.findActiveByTransactionId(transactionId);
      if (concurrent && concurrent.participantIds.includes(userId)) return this.withSfuCredentials(concurrent, userId);
      throw error;
    }
  }

  async assertParticipant(callId: string, userId: string) {
    const call = await this.repo.find(callId);
    if (!call) throw new CallNotFoundException();
    if (!call.participantIds.includes(userId)) throw new CallAccessException();
    return call;
  }

  async start(callId: string, userId: string) {
    const call = await this.assertParticipant(callId, userId);
    if (call.status === 'ENDED') throw new CallAccessException();
    return this.withSfuCredentials(await this.repo.update(callId, { status: 'ACTIVE', startedAt: call.startedAt ?? new Date() }), userId);
  }

  private withSfuCredentials<T extends { id: string; participantIds: string[]; status: string }>(call: T, userId: string) {
    const secret = this.config.get<string>('sfu.sharedSecret') ?? '';
    const url = this.config.get<string>('sfu.publicUrl') ?? '';
    if (!secret || !url || !call.participantIds.includes(userId) || call.status === 'ENDED') return call;
    const expiresAt = Math.floor(Date.now() / 1000) + (this.config.get<number>('sfu.tokenTtlSeconds') ?? 300);
    const payload = Buffer.from(JSON.stringify({ sub: userId, callId: call.id, exp: expiresAt })).toString('base64url');
    const signature = createHmac('sha256', secret).update(payload).digest('base64url');
    return { ...call, sfu: { url, token: `${payload}.${signature}`, expiresAt } };
  }

  async end(callId: string, userId: string) {
    const call = await this.assertParticipant(callId, userId);
    if (call.status === 'ENDED') return call;
    return this.repo.update(callId, { status: 'ENDED', endedAt: new Date() });
  }
}
