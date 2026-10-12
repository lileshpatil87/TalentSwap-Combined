import { Inject, Injectable, Logger } from '@nestjs/common';
import { Role } from '@talentswap/types';
import { QueueService } from '@app/cache/queue.service';
import { SKILLS_REPOSITORY } from './skills.constants';
import type { SkillsRepository } from './skills.repository';
import { SkillCategoryNotFoundException, SkillNotFoundException, SkillOwnershipException } from './skills.exceptions';
import { UsersService } from '../users/users.service';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(
    @Inject(SKILLS_REPOSITORY) private readonly repo: SkillsRepository,
    private readonly users: UsersService,
    private readonly queue: QueueService,
  ) {}

  async create(userId: string, input: any) {
    await this.users.assertActive(userId);
    if (!(await this.repo.categoryExists(input.categoryId))) {
      throw new SkillCategoryNotFoundException(String(input.categoryId));
    }
    const skill = await this.repo.create({ ...input, userId });
    await this.enqueueEmbedding(skill.id);
    await this.enqueueSearchIndex(skill.id, 'index');
    return skill;
  }


  private async enqueueEmbedding(skillId: string) {
    try {
      await this.queue.addJob('skill-embeddings', 'skill-embed', { skillId }, {
        jobId: `skill-embed:${skillId}:${Date.now()}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
      });
    } catch (error) {
      // Full-text search is maintained by PostgreSQL and remains available even
      // when the optional semantic-embedding queue is temporarily unavailable.
      this.logger.warn(`Embedding enqueue deferred for skill ${skillId}: ${error instanceof Error ? error.message : 'UNKNOWN'}`);
    }
  }

  private async enqueueSearchIndex(skillId: string, operation: 'index' | 'delete') {
    try { await this.queue.addJob('search-sync', operation, { skillId }, { jobId: `search-${operation}:${skillId}:${Date.now()}`, attempts: 5, backoff: { type: 'exponential', delay: 1000 } }); }
    catch (error) { this.logger.warn(`Search index enqueue deferred for skill ${skillId}: ${error instanceof Error ? error.message : 'UNKNOWN'}`); }
  }

  async similarByEmbedding(vector: number[], filters: any) {
    return this.repo.similarByEmbedding(vector, filters);
  }

  async searchFullText(q: string, query: any) {
    const r = await this.repo.searchFullText(q, query);
    return { ...r, page: query.page, limit: query.limit, totalPages: Math.ceil(r.total / query.limit) };
  }

  async get(id: string) {
    const item = await this.repo.findById(id);
    if (!item || !item.isActive) throw new SkillNotFoundException(id);
    return item;
  }

  async list(query: any) {
    const where: any = {};
    if (query.q) where.OR = [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }];
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.proficiency) where.proficiency = query.proficiency;
    if (query.type) where.type = query.type;
    if (query.userId) where.userId = query.userId;
    const result = await this.repo.list({ where, page: query.page, limit: query.limit });
    return { ...result, page: query.page, limit: query.limit, totalPages: Math.ceil(result.total / query.limit) };
  }

  async update(id: string, actorId: string, role: Role, input: any) {
    const skill = await this.get(id);
    if (skill.userId !== actorId && role !== Role.ADMIN) throw new SkillOwnershipException();
    if (input.categoryId && !(await this.repo.categoryExists(input.categoryId))) {
      throw new SkillCategoryNotFoundException(String(input.categoryId));
    }
    const updated = await this.repo.update(id, input);
    if (input.title || input.description || input.categoryId || input.type || input.proficiency || input.pointRate) { await this.enqueueEmbedding(id); }
    await this.enqueueSearchIndex(id, 'index');
    return updated;
  }

  async remove(id: string, actorId: string, role: Role) {
    const skill = await this.get(id);
    if (skill.userId !== actorId && role !== Role.ADMIN) throw new SkillOwnershipException();
    const result = await this.repo.deactivate(id);
    await this.enqueueSearchIndex(id, 'delete');
    return result;
  }

  categories() { return this.repo.listCategories(); }
}
