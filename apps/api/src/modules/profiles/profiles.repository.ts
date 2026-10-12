import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

export type ProfileRecord = {
  id: string; userId: string; displayName: string; headline: string | null; bio: string | null;
  avatarUrl: string | null; location: string | null; availability: string | null; timezone: string | null;
  languages: string[]; skillPoints: number; reputationScore: any; totalExchanges: number; isVerified: boolean;
  verificationBadge: string | null; experienceLevel: any; experiencePoints: number; lastActiveAt: Date | null;
  createdAt: Date; updatedAt: Date;
};
export type ProfileUpdateInput = Partial<Pick<ProfileRecord, 'displayName' | 'headline' | 'bio' | 'avatarUrl' | 'location' | 'availability' | 'timezone' | 'languages'>>;
export interface ProfilesRepository {
  findByUserId(userId: string): Promise<ProfileRecord | null>;
  create(userId: string, displayName: string): Promise<ProfileRecord>;
  update(userId: string, input: ProfileUpdateInput): Promise<ProfileRecord>;
  markVerified(userId: string, badge?: string): Promise<ProfileRecord>;
  updateReputation(userId: string, score: number): Promise<ProfileRecord>;
  addExperience(userId: string, points: number, level: any): Promise<ProfileRecord>;
  touch(userId: string): Promise<void>;
}

@Injectable()
export class PrismaProfilesRepository implements ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}
  findByUserId(userId: string) { return this.prisma.profile.findUnique({ where: { userId } }) as Promise<ProfileRecord | null>; }
  create(userId: string, displayName: string) { return this.prisma.profile.create({ data: { userId, displayName } }) as Promise<ProfileRecord>; }
  update(userId: string, input: ProfileUpdateInput) { return this.prisma.profile.update({ where: { userId }, data: input }) as Promise<ProfileRecord>; }
  addExperience(userId: string, points: number, level: any) { return this.prisma.profile.update({ where: { userId }, data: { experiencePoints: { increment: points }, experienceLevel: level } }) as Promise<ProfileRecord>; }
  updateReputation(userId: string, score: number) { return this.prisma.profile.update({ where: { userId }, data: { reputationScore: score } }) as Promise<ProfileRecord>; }
  markVerified(userId: string, badge?: string) { return this.prisma.profile.update({ where: { userId }, data: { isVerified: true, verificationBadge: badge ?? null } }) as Promise<ProfileRecord>; }
  async touch(userId: string) { await this.prisma.profile.updateMany({ where: { userId }, data: { lastActiveAt: new Date() } }); }
}
