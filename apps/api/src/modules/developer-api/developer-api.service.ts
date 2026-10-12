import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';
import { ReadReplicaService } from '@app/database/read-replica.service';

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
@Injectable()
export class DeveloperApiService {
  constructor(private readonly prisma: PrismaService, private readonly readReplica: ReadReplicaService) {}

  async createKey(ownerUserId: string, name: string, expiresInDays = 90) {
    const rawKey = `tsk_live_${randomBytes(32).toString('base64url')}`;
    const expiresAt = new Date(Date.now() + Math.max(1, Math.min(365, Math.trunc(expiresInDays))) * 86400000);
    const record = await this.prisma.developerApiKey.create({ data: { ownerUserId, name, keyHash: hashKey(rawKey), scopes: ['skills:read'], expiresAt } });
    // The raw credential is returned only once and is never persisted.
    return { id: record.id, name: record.name, scopes: record.scopes, createdAt: record.createdAt, expiresAt: record.expiresAt, apiKey: rawKey };
  }

  async listKeys(ownerUserId: string) {
    return this.prisma.developerApiKey.findMany({ where: { ownerUserId, revokedAt: null }, select: { id: true, name: true, scopes: true, createdAt: true, expiresAt: true, lastUsedAt: true }, orderBy: { createdAt: 'desc' } });
  }

  async revokeKey(ownerUserId: string, id: string) {
    const result = await this.prisma.developerApiKey.updateMany({ where: { id, ownerUserId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException('API key not found or already revoked.');
    return { revoked: true };
  }

  async authenticate(rawKey: string | undefined) {
    if (!rawKey || rawKey.length > 160 || !rawKey.startsWith('tsk_live_')) throw new ForbiddenException('A valid x-api-key header is required.');
    const keyHash = hashKey(rawKey);
    const record = await this.prisma.developerApiKey.findUnique({ where: { keyHash }, include: { owner: { select: { isBanned: true } } } });
    if (!record || record.owner.isBanned || record.revokedAt || (record.expiresAt && record.expiresAt <= new Date()) || !record.scopes.includes('skills:read')) {
      // Keep a constant-time comparison for the stored digest before denying.
      const supplied = Buffer.from(keyHash); const expected = Buffer.from(record?.keyHash ?? '0'.repeat(64));
      if (supplied.length === expected.length) timingSafeEqual(supplied, expected);
      throw new ForbiddenException('API key is invalid, expired, revoked, or lacks scope.');
    }
    if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 5 * 60 * 1000) {
      await this.prisma.developerApiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
    }
    return record;
  }

  async listPublicSkills(q = '', limit = 20) {
    const take = Math.max(1, Math.min(50, Number.isFinite(limit) ? Math.trunc(limit) : 20));
    return this.readReplica.client.skill.findMany({ where: { isActive: true, user: { isBanned: false, settings: { is: { profileVisibility: 'PUBLIC' } } }, ...(q.trim() ? { OR: [{ title: { contains: q.trim(), mode: 'insensitive' as const } }, { description: { contains: q.trim(), mode: 'insensitive' as const } }] } : {}) },
      select: { id: true, title: true, description: true, proficiency: true, type: true, pointRate: true, category: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, profile: { select: { displayName: true, headline: true, avatarUrl: true } } } } }, take, orderBy: { updatedAt: 'desc' } });
  }
}
