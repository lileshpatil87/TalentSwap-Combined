import { Injectable } from '@nestjs/common';
import { SkillsService } from '../skills/skills.service';
import { ProfilesService } from '../profiles/profiles.service';
import { EmbeddingService } from '../ai-embeddings/embedding.service';

@Injectable()
export class MatchingService {
  constructor(private readonly skills: SkillsService, private readonly profiles: ProfilesService, private readonly embeddings: EmbeddingService) {}

  async suggestions(userId: string, q: any) {
    const source = await this.profiles.getByUserId(userId, true);
    const query = q.q || [source.bio, source.name].filter(Boolean).join(' ');
    if (!query.trim()) return { items: [], page: q.page, limit: q.limit, total: 0, totalPages: 0 };

    let rawItems: any[];
    let total: number;
    let strategy: string;
    try {
      const vector = await this.embeddings.embed(query);
      const results = await this.skills.similarByEmbedding(vector, { userId, categoryId: q.categoryId, type: q.type ?? 'OFFERING', limit: Math.min(q.limit * q.page, 100) });
      total = results.length;
      const start = (q.page - 1) * q.limit;
      rawItems = results.slice(start, start + q.limit);
      strategy = 'pgvector-cosine';
    } catch {
      const fallback = await this.skills.list({ q: query, categoryId: q.categoryId, type: q.type ?? 'OFFERING', page: 1, limit: Math.min(q.limit * q.page, 100) });
      rawItems = fallback.items.filter((item: any) => item.userId !== userId);
      total = rawItems.length;
      const start = (q.page - 1) * q.limit;
      rawItems = rawItems.slice(start, start + q.limit).map((item: any) => ({
        ...item, category: item.category?.name ?? String(item.categoryId),
        userName: item.user?.profile?.displayName ?? 'TalentSwap member',
        headline: item.user?.profile?.headline ?? null, location: item.user?.profile?.location ?? null,
        avatar: item.user?.profile?.avatarUrl ?? null, rating: item.user?.profile?.reputationScore ?? 0,
        reviewCount: item.user?.profile?.totalExchanges ?? 0, verified: item.user?.profile?.isVerified ?? false,
        role: item.user?.role ?? 'USER', score: 0,
      }));
      strategy = 'postgres-text-fallback';
    }

    const items = rawItems.map((item: any) => {
      const score = Number(item.score ?? 0);
      const matchScore = Math.round(Math.max(0, Math.min(1, score)) * 100);
      const name = item.userName || 'TalentSwap member';
      return {
        id: item.id,
        user: { id: item.userId, name, role: item.role ?? 'USER', avatar: item.avatar ?? undefined, headline: item.headline ?? undefined, location: item.location ?? undefined, rating: Number(item.rating ?? 0), reviewCount: Number(item.reviewCount ?? 0), verified: Boolean(item.verified) },
        offeredSkill: { id: item.id, userId: item.userId, userName: name, title: item.title, category: typeof item.category === 'string' ? item.category : item.category?.name ?? String(item.categoryId), description: item.description, level: item.proficiency, pointsPerHour: item.pointRate, tags: [], active: true },
        wantedSkill: 'Explore a complementary skill', matchScore, reason: 'Suggested by the platform based on profile and skill similarity.',
      };
    });
    return { items, page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit), strategy };
  }
}
