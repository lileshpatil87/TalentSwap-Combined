import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Read-only query connection for regional read routing. Each regional app
 * deployment points DATABASE_READ_URL at its nearest Aurora reader endpoint.
 * It deliberately falls back to the primary client when no reader is configured.
 * Financial writes and transactions must continue to use PrismaService.
 */
@Injectable()
export class ReadReplicaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;
  private readonly ownsClient: boolean;

  constructor(config: ConfigService, primary: PrismaService) {
    const readUrl = config.get<string>('database.readUrl') ?? '';
    this.ownsClient = Boolean(readUrl && readUrl !== config.get<string>('database.url'));
    this.client = this.ownsClient
      ? new PrismaClient({ datasources: { db: { url: readUrl } }, log: [{ emit: 'event', level: 'error' }] })
      : primary;
  }

  async onModuleInit() { if (this.ownsClient) await this.client.$connect(); }
  async onModuleDestroy() { if (this.ownsClient) await this.client.$disconnect(); }

  async searchSkills(query: string, categoryId: number | null, page: number, limit: number) {
    const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit || 20)));
    const safePage = Math.max(1, Math.trunc(page || 1));
    const [items, counts] = await Promise.all([
      this.client.$queryRawUnsafe<any[]>(
        `SELECT s.id, s.user_id AS "userId", s.category_id AS "categoryId", s.title, s.description, s.proficiency, s.type, s.point_rate AS "pointRate", s.created_at AS "createdAt", ts_rank(s.search_vector, websearch_to_tsquery('simple', $1)) AS score FROM skills s JOIN users u ON u.id = s.user_id LEFT JOIN user_settings us ON us.user_id = u.id WHERE s.is_active = true AND u.is_banned = false AND COALESCE(us.profile_visibility, 'PUBLIC') = 'PUBLIC' AND s.search_vector @@ websearch_to_tsquery('simple', $1) AND ($2::int IS NULL OR s.category_id = $2::int) ORDER BY score DESC, s.created_at DESC LIMIT $3 OFFSET $4`,
        query.trim(), categoryId, safeLimit, (safePage - 1) * safeLimit,
      ),
      this.client.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM skills s JOIN users u ON u.id = s.user_id LEFT JOIN user_settings us ON us.user_id = u.id WHERE s.is_active = true AND u.is_banned = false AND COALESCE(us.profile_visibility, 'PUBLIC') = 'PUBLIC' AND s.search_vector @@ websearch_to_tsquery('simple', $1) AND ($2::int IS NULL OR s.category_id = $2::int)`,
        query.trim(), categoryId,
      ),
    ]);
    return { items, total: Number(counts[0]?.count ?? 0), page: safePage, limit: safeLimit, totalPages: Math.ceil(Number(counts[0]?.count ?? 0) / safeLimit) };
  }
}
