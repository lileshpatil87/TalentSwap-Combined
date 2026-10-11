import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

export interface SkillsRepository {
  searchFullText(q: string, filters: any): Promise<{ items: any[]; total: number }>;
  similarByEmbedding(vector: number[], filters: any): Promise<any[]>;
  rebuildSearchProjection(): Promise<number>;
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
        include: { category: true },
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
      `SELECT id, user_id AS "userId", title, description, category_id AS "categoryId",
              proficiency, type, point_rate AS "pointRate",
              1 - (embedding <=> $1::vector) AS score
         FROM skills
        WHERE is_active = true
          AND embedding IS NOT NULL
          AND user_id <> $2::uuid
          AND ($3::int IS NULL OR category_id = $3::int)
          AND ($4::skill_type IS NULL OR type = $4::skill_type)
        ORDER BY embedding <=> $1::vector, id
        LIMIT $5`,
      v,
      filters.userId,
      categoryId,
      type,
      limit,
    );
  }

  async rebuildSearchProjection() {
    // search_vector is a generated column. Re-writing the source text causes
    // PostgreSQL to recompute the generated projection; the GIN index then
    // receives the current generated value transactionally.
    const result = await this.prisma.$executeRawUnsafe(
      `UPDATE skills SET title = title WHERE is_active = true`,
    );
    return Number(result);
  }
}
