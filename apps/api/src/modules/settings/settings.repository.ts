import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

export interface UserSettingsInput {
  emailNotifications: boolean;
  messageNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: 'PUBLIC' | 'MEMBERS';
}

const DEFAULTS: UserSettingsInput = {
  emailNotifications: true,
  messageNotifications: true,
  marketingEmails: false,
  profileVisibility: 'PUBLIC',
};

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...DEFAULTS },
      update: {},
    });
  }

  async getProfileVisibility(userId: string): Promise<'PUBLIC' | 'MEMBERS'> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId }, select: { profileVisibility: true } });
    return (settings?.profileVisibility ?? 'PUBLIC') as 'PUBLIC' | 'MEMBERS';
  }

  update(userId: string, input: UserSettingsInput) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  }
}
