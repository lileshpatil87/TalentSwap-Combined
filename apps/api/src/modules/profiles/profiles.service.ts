import { Inject, Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { Role } from '@talentswap/types';
import { PROFILES_REPOSITORY } from './profiles.constants';
import type { ProfilesRepository, ProfileRecord, ProfileUpdateInput } from './profiles.repository';
import { ProfileNotFoundException, ProfileOwnershipException } from './profiles.exceptions';
import { UsersService } from '../users/users.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ProfilesService {
  constructor(@Inject(PROFILES_REPOSITORY) private readonly repository: ProfilesRepository, private readonly users: UsersService, private readonly settings: SettingsService) {}

  async getByUserId(userId: string, publicOnly = false, viewerId?: string) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) throw new ProfileNotFoundException(userId);
    if (publicOnly && viewerId !== userId && !viewerId && await this.settings.getProfileVisibility(userId) === 'MEMBERS') throw new ProfileNotFoundException(userId);
    const user = await this.users.getById(userId);
    return this.toClientProfile(profile, user, publicOnly);
  }

  async getOrCreate(userId: string) {
    let profile = await this.repository.findByUserId(userId);
    if (!profile) {
      const user = await this.users.getById(userId);
      const localPart = user.email.split('@')[0].replace(/[._+-]+/g, ' ').trim();
      const displayName = localPart.slice(0, 100) || 'TalentSwap member';
      try { profile = await this.repository.create(userId, displayName); }
      catch (error) {
        // Handles a concurrent first profile read without masking other DB failures.
        profile = await this.repository.findByUserId(userId);
        if (!profile) throw error;
      }
    }
    const user = await this.users.getById(userId);
    return this.toClientProfile(profile, user, false);
  }

  async update(userId: string, actorId: string, actorRole: Role, input: Record<string, unknown>) {
    if (actorId !== userId && actorRole !== Role.ADMIN) throw new ProfileOwnershipException();
    await this.getOrCreate(userId);
    const clean: ProfileUpdateInput = {};
    if (typeof input.displayName === 'string') clean.displayName = input.displayName.trim();
    if (typeof input.headline === 'string') clean.headline = input.headline.trim() || null;
    if (typeof input.bio === 'string') clean.bio = sanitizeHtml(input.bio, { allowedTags: [], allowedAttributes: {} });
    if (typeof input.avatarUrl === 'string') clean.avatarUrl = input.avatarUrl;
    if (typeof input.location === 'string') clean.location = input.location.trim();
    if (typeof input.availability === 'string') clean.availability = input.availability.trim();
    if (typeof input.timezone === 'string') clean.timezone = input.timezone.trim();
    if (Array.isArray(input.languages)) clean.languages = input.languages as string[];
    await this.repository.update(userId, clean);
    return this.getByUserId(userId, false);
  }

  async addExperience(userId: string, points: number, level: any) { return this.repository.addExperience(userId, points, level); }
  async updateReputation(userId: string, score: number) { return this.repository.updateReputation(userId, score); }
  async markVerified(userId: string, badge?: string) { await this.getOrCreate(userId); return this.repository.markVerified(userId, badge); }
  async touch(userId: string) { await this.repository.touch(userId); }

  private toClientProfile(p: ProfileRecord, user: { id: string; email: string; role: Role; createdAt: Date }, publicOnly: boolean) {
    return {
      id: user.id, name: p.displayName, ...(publicOnly ? {} : { email: user.email }), role: user.role,
      avatar: p.avatarUrl ?? undefined, headline: p.headline ?? 'TalentSwap member', location: p.location ?? '',
      rating: Number(p.reputationScore), reviewCount: p.totalExchanges, verified: p.isVerified, bio: p.bio ?? '',
      availability: p.availability ?? '', timezone: p.timezone ?? 'UTC', languages: p.languages?.length ? p.languages : ['English'],
      joinedAt: user.createdAt.toISOString().slice(0, 10), userId: p.userId, reputationScore: Number(p.reputationScore),
      totalExchanges: p.totalExchanges, isVerified: p.isVerified, verificationBadge: p.verificationBadge,
      experienceLevel: p.experienceLevel, experiencePoints: p.experiencePoints,
    };
  }
}
