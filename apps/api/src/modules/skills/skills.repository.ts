import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

export interface SkillsRepository {
  searchFullText(q: string, filters: any): Promise<{ items: any[]; total: number }>;
  similarByEmbedding(vector: number[], filters: any): Promise<any[]>;
  create(data: any): Promise<any>;
  findById(id: string): Promise<any>;
  list(args: any): Promise<{ items: any[]; total: number }>;
  update(id: string, data: any): Promise<any>;
  deactivate(id: string): Promise<any>;
  categoryExists(id: number): Promise<boolean>;
  listCategories(): Promise<any[]>;
}

@Injectable()
export class PrismaSkillsRepository implements SkillsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.skill.create({ data, include: { category: true } });
  }

  findById(id: string) {
    return this.prisma.skill.findUnique({ where: { id }, include: { category: true } });
  }

  async list(args: any) {
    const where = { isActive: true, ...(args.where ?? {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.skill.findMany({
        where,
        include: { category: true, user: { select: { id: true, role: true, profile: { select: { displayName: true, headline: true, location: true, avatarUrl: true, reputationScore: true, totalExchanges: true, isVerified: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (args.page - 1) * args.limit,
        take: args.limit,
      }),
      this.prisma.skill.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: any) {
    return this.prisma.skill.update({ where: { id }, data, include: { category: true } });
  }

  deactivate(id: string) {
    return this.prisma.skill.update({ where: { id }, data: { isActive: false } });
  }

  async categoryExists(id: number) {
    return (await this.prisma.skillCategory.count({ where: { id, isActive: true } })) > 0;
  }

  listCategories() {
    return this.prisma.skillCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async searchFullText(q: string, filters: any) {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const offset = ((filters.page ?? 1) - 1) * limit;
    const categoryId = filters.categoryId ?? null;
    const query = q.trim();
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, user_id AS "userId", category_id AS "categoryId", title, description,
              proficiency, type, point_rate AS "pointRate", created_at AS "createdAt",
              ts_rank(search_vector, websearch_to_tsquery('simple', $1)) AS score
         FROM skills
        WHERE is_active = true
          AND search_vector @@ websearch_to_tsquery('simple', $1)
          AND ($2::int IS NULL OR category_id = $2::int)
        ORDER BY score DESC, created_at DESC
        LIMIT $3 OFFSET $4`,
      query,
      categoryId,
      limit,
      offset,
    );
    const countRows = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count
         FROM skills
        WHERE is_active = true
          AND search_vector @@ websearch_to_tsquery('simple', $1)
          AND ($2::int IS NULL OR category_id = $2::int)`,
      query,
      categoryId,
    );
    return { items: rows, total: Number(countRows[0]?.count ?? 0) };
  }

  async similarByEmbedding(vector: number[], filters: any) {
    const v = `[${vector.join(',')}]`;
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const categoryId = filters.categoryId ?? null;
    const type = filters.type ?? null;
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT s.id, s.user_id AS "userId", s.title, s.description, s.category_id AS "categoryId",
              c.name AS category, s.proficiency, s.type, s.point_rate AS "pointRate",
              p.display_name AS "userName", p.headline, p.location, p.avatar_url AS avatar,
              p.reputation_score AS rating, p.total_exchanges AS "reviewCount", p.is_verified AS verified,
              u.role, 1 - (s.embedding <=> $1::vector) AS score
         FROM skills s
         JOIN users u ON u.id = s.user_id
         JOIN skill_categories c ON c.id = s.category_id
         LEFT JOIN profiles p ON p.user_id = s.user_id
        WHERE s.is_active = true
          AND s.embedding IS NOT NULL
          AND s.user_id <> $2::uuid
          AND ($3::int IS NULL OR s.category_id = $3::int)
          AND ($4::skill_type IS NULL OR s.type = $4::skill_type)
        ORDER BY s.embedding <=> $1::vector, s.id
        LIMIT $5`,
      v,
      filters.userId,
      categoryId,
      type,
      limit,
    );
  }


}
