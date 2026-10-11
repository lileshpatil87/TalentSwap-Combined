import { Injectable } from '@nestjs/common';
import { SkillsService } from '../skills/skills.service';
import { ProfilesService } from '../profiles/profiles.service';
import { EmbeddingService } from '../ai-embeddings/embedding.service';

@Injectable()
export class MatchingService {
  constructor(
    private readonly skills: SkillsService,
    private readonly profiles: ProfilesService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async suggestions(userId: string, q: any) {
    const source = await this.profiles.getByUserId(userId, true);
    const query = q.q || [source.bio, source.displayName].filter(Boolean).join(' ');
    if (!query.trim()) return { items: [], page: q.page, limit: q.limit, total: 0, totalPages: 0 };

    try {
      const vector = await this.embeddings.embed(query);
      const items = await this.skills.similarByEmbedding(vector, {
        userId,
        categoryId: q.categoryId,
        type: q.type,
        limit: Math.min(q.limit * q.page, 100),
      });
      const start = (q.page - 1) * q.limit;
      const pageItems = items.slice(start, start + q.limit);
      return {
        items: pageItems,
        page: q.page,
        limit: q.limit,
        total: items.length,
        totalPages: Math.ceil(items.length / q.limit),
        strategy: 'pgvector-cosine',
      };
    } catch {
      const fallback = await this.skills.list({ q: query, categoryId: q.categoryId, type: q.type, page: q.page, limit: q.limit });
      return {
        ...fallback,
        items: fallback.items.filter((x: any) => x.userId !== userId).map((skill: any) => ({ ...skill, score: 0 })),
        strategy: 'postgres-text-fallback',
      };
    }
  }
}
