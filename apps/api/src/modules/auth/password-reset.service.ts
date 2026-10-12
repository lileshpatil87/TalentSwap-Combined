import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailConfig } from '@app/config/configuration';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '@app/database/prisma.service';
import { PasswordService } from './password.service';

const GENERIC_MESSAGE = 'If an account exists for that email address, password reset instructions will be sent.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  constructor(private readonly prisma: PrismaService, private readonly passwords: PasswordService, private readonly config: ConfigService) {}

  async request(email: string): Promise<{ message: string }> {
    const emailConfig = this.config.get<EmailConfig>('email');
    const apiKey = emailConfig?.resendApiKey;
    const from = emailConfig?.from;
    const appUrl = emailConfig?.appPublicUrl;
    // Fail consistently before checking whether the account exists. Never reveal account existence.
    if (!apiKey || !from || !appUrl) {
      this.logger.error('Password reset email is not configured; set RESEND_API_KEY, EMAIL_FROM and APP_PUBLIC_URL.');
      throw new Error('PASSWORD_RESET_EMAIL_NOT_CONFIGURED');
    }
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, email: true } });
    if (!user) return { message: GENERIC_MESSAGE };

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [user.email], subject: 'Reset your TalentSwap password', text: `Use this link within 30 minutes to reset your TalentSwap password: ${resetUrl}\n\nIf you did not request this, ignore this email.` }),
      });
      if (!response.ok) {
        await this.prisma.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null }, data: { usedAt: new Date() } });
        this.logger.error(`Password reset email provider returned HTTP ${response.status}.`);
      }
    } catch {
      await this.prisma.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null }, data: { usedAt: new Date() } });
      this.logger.error('Password reset email delivery failed.');
    }
    return { message: GENERIC_MESSAGE };
  }

  async reset(token: string, password: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new BadRequestException('The password reset link is invalid or expired. Request a new one.');
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, userId: record.userId, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('The password reset link is invalid or expired. Request a new one.');
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.refreshToken.updateMany({ where: { userId: record.userId, isRevoked: false }, data: { isRevoked: true } });
    });
    return { message: 'Password reset successfully. Please sign in with your new password.' };
  }
}
