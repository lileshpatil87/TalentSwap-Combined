import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '@app/cache/queue.service';
import { ReadReplicaService } from '@app/database/read-replica.service';
import { PrismaService } from '@app/database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly queue: QueueService, private readonly config: ConfigService, private readonly readReplica: ReadReplicaService, private readonly prisma: PrismaService) {}

  async search(q: string, filters: any) {
    if (!q.trim()) return { query: q, items: [], page: filters.page ?? 1, limit: filters.limit ?? 20, total: 0, totalPages: 0 };
    const backend = this.config.get<string>('search.backend') ?? 'postgres';
    const endpoint = this.config.get<string>('search.openSearchUrl');
    if (backend === 'opensearch' && endpoint) {
      try {
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(50, Number(filters.limit) || 20));
        const response = await this.openSearchFetch(`${endpoint.replace(/\/$/, '')}/talentswap-skills/_search`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ from: (page - 1) * limit, size: limit, query: { bool: { must: [{ multi_match: { query: q.trim(), fields: ['title^3', 'description', 'category.name'] } }], filter: [{ term: { ownerIsBanned: false } }, { term: { profileVisibility: 'PUBLIC' } }, ...(filters.categoryId ? [{ term: { categoryId: Number(filters.categoryId) } }] : [])] } }, sort: [{ _score: 'desc' }, { updatedAt: 'desc' }] }),
        });
        if (response.ok) {
          const result = await response.json() as any;
          const items = (result.hits?.hits ?? []).map((hit: any) => ({ id: hit._id, ...hit._source }));
          const visible = await this.prisma.skill.findMany({ where: { id: { in: items.map((item: any) => item.id) }, isActive: true, user: { isBanned: false, settings: { is: { profileVisibility: 'PUBLIC' } } } }, select: { id: true } });
          const visibleIds = new Set(visible.map(skill => skill.id));
          const safeItems = items.filter((item: any) => visibleIds.has(item.id));
          const rawTotal = Number(result.hits?.total?.value ?? 0);
          const total = safeItems.length === items.length ? rawTotal : safeItems.length;
          return { query: q, items: safeItems, page, limit, total, totalPages: Math.ceil(total / limit), projection: 'OpenSearch (Phase 4)' };
        }
      } catch { /* OpenSearch is optional; retain PostgreSQL search availability during outages. */ }
      // Availability fallback keeps discovery usable during an OpenSearch outage.
    }
    const result = await this.readReplica.searchSkills(q, filters.categoryId ?? null, filters.page ?? 1, filters.limit ?? 20);
    return { query: q, ...result, projection: 'Regional PostgreSQL reader / generated tsvector with GIN index' };
  }

  private async openSearchFetch(url: string, init: RequestInit) {
    const username = this.config.get<string>('search.openSearchUsername') ?? '';
    const password = this.config.get<string>('search.openSearchPassword') ?? '';
    const headers = new Headers(init.headers);
    if (username && password) headers.set('authorization', `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`);
    return fetch(url, { ...init, headers, signal: AbortSignal.timeout(2500) });
  }

  async rebuild() {
    const jobId = `search-rebuild:${Date.now()}`;
    await this.queue.addJob('search-sync', 'rebuild', { requestedAt: new Date().toISOString() }, { jobId, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    return { queued: true, jobId, operation: 'rebuild configured search index' };
  }
}
