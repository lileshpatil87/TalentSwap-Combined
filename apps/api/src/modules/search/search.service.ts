import { Injectable } from '@nestjs/common';
import { SkillsService } from '../skills/skills.service';
import { QueueService } from '@app/cache/queue.service';

@Injectable()
export class SearchService {
  constructor(private readonly skills: SkillsService, private readonly queue: QueueService) {}

  async search(q: string, filters: any) {
    if (!q.trim()) return { query: q, items: [], page: filters.page ?? 1, limit: filters.limit ?? 20, total: 0, totalPages: 0 };
    const result = await this.skills.searchFullText(q, filters);
    return { query: q, ...result, projection: 'PostgreSQL tsvector/GIN derived projection' };
  }

  async rebuild() {
    const affected = await this.skills.rebuildSearchProjection();
    await this.queue.addJob('search-sync', 'rebuild', { requestedAt: new Date().toISOString() }, { jobId: `search-rebuild:${Date.now()}` });
    return { rebuilt: affected, source: 'authoritative skills service', projection: 'generated tsvector + GIN' };
  }
}
