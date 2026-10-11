import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QueueService } from '@app/cache/queue.service';
import { GamificationRepository } from './gamification.repository';
import { ProfilesService } from '../profiles/profiles.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';

@Injectable()
export class GamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly profiles: ProfilesService,
    private readonly leaderboards: LeaderboardsService,
    private readonly queue: QueueService,
  ) {}

  private levelForXp(xp: number) {
    if (xp >= 1000) return 'CHAMPION';
    if (xp >= 600) return 'PLATINUM';
    if (xp >= 300) return 'GOLD';
    if (xp >= 100) return 'SILVER';
    return 'BRONZE';
  }

  async awardXp(userId: string, xp: number, reason: string) {
    if (!Number.isInteger(xp) || xp <= 0) throw new RangeError('xp must be a positive integer');
    const p = await this.profiles.getOrCreate(userId);
    const next = p.experiencePoints + xp;
    const updated = await this.profiles.addExperience(userId, xp, this.levelForXp(next));
    await this.leaderboards.syncUser(userId);
    await this.evaluateBadges(userId, next);
    return { ...updated, reason };
  }

  private async evaluateBadges(userId: string, xp: number) {
    const badges = await this.repo.badgesForXp(xp);
    for (const b of badges) await this.repo.award(userId, b.id);
  }

  @OnEvent('transaction.completed', { async: true })
  async onTransaction(e: any) {
    await this.queue.addJob('gamification', 'award-xp', { userId: e.providerId, xp: 10, reason: 'transaction.completed' }, { jobId: `xp:transaction:${e.transactionId}:provider` });
    await this.queue.addJob('gamification', 'award-xp', { userId: e.initiatorId, xp: 5, reason: 'transaction.completed' }, { jobId: `xp:transaction:${e.transactionId}:initiator` });
  }

  @OnEvent('rating.created', { async: true })
  async onRating(e: any) {
    await this.queue.addJob('gamification', 'award-xp', { userId: e.raterId, xp: 2, reason: 'rating.created' }, { jobId: `xp:rating:${e.ratingId}:rater` });
    await this.queue.addJob('gamification', 'award-xp', { userId: e.rateeId, xp: 5, reason: 'rating.received' }, { jobId: `xp:rating:${e.ratingId}:ratee` });
  }

  badges() { return this.repo.badges(); }
  userBadges(userId: string) { return this.repo.userBadges(userId); }
}
