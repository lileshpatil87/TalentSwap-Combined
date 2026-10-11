import { Injectable } from '@nestjs/common';
import { Role } from '@talentswap/types';
import { CommunityRepository } from './community.repository';
import { UsersService } from '../users/users.service';
import { ResourceNotFoundException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';

@Injectable()
export class CommunityService {
  constructor(private readonly repo: CommunityRepository, private readonly users: UsersService) {}

  async create(authorId: string, input: any) {
    await this.users.assertActive(authorId);
    return this.repo.create({ ...input, authorId });
  }

  async get(id: string) {
    const p = await this.repo.find(id);
    if (!p || !p.isActive) throw new ResourceNotFoundException('Community post', id);
    return p;
  }

  async list(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const [items, total] = await this.repo.list(safePage, safeLimit);
    return { items, page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) };
  }

  async remove(id: string, actorId: string, role: Role) {
    const p = await this.get(id);
    if (p.authorId !== actorId && role !== Role.ADMIN && role !== Role.MODERATOR) throw new ForbiddenActionException();
    await this.repo.remove(id);
    return { deleted: true };
  }
}
