import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Role } from '@talentswap/types';
import { USERS_REPOSITORY } from './users.constants';
import type { UsersRepository, UserRecord, UserUpdateInput } from './users.repository';
import { BannedUserException, UserEmailConflictException, UserNotFoundException, UserOwnershipException } from './users.exceptions';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly repository: UsersRepository) {}

  async getById(id: string): Promise<UserRecord> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  async getAuthenticatedUser(id: string): Promise<UserRecord> { return this.getById(id); }

  async getForActor(id: string, actorId: string, actorRole: Role): Promise<UserRecord> {
    if (actorId !== id && actorRole !== Role.ADMIN) {
      throw new UserOwnershipException();
    }
    return this.getById(id);
  }

  async update(id: string, _actorId: string, actorRole: Role, input: UserUpdateInput): Promise<UserRecord> {
    // User-table fields are security-sensitive (role, ban status, verification,
    // and email). They must never be changed through a self-service PATCH;
    // email changes need a dedicated verification flow. Admin workflows
    // additionally enforce Role.ADMIN at their route boundary.
    if (actorRole !== Role.ADMIN) throw new UserOwnershipException();
    if (input.email) {
      const existing = await this.repository.findByEmail(input.email);
      if (existing && existing.id !== id) throw new UserEmailConflictException();
    }
    return this.repository.update(id, input);
  }

  async deactivate(id: string, actorId: string, actorRole: Role): Promise<void> {
    if (actorId !== id && actorRole !== Role.ADMIN) throw new UserOwnershipException();
    if (actorId === id && actorRole === Role.ADMIN) throw new BadRequestException('Administrators cannot deactivate their own account.');
    await this.getById(id);
    await this.repository.delete(id);
  }

  async count(){return this.repository.count();}
  async listForAdmin(page=1,limit=20){return this.repository.list(page,limit);}

  async assertActive(id: string): Promise<UserRecord> {
    const user = await this.getById(id);
    if (user.isBanned) throw new BannedUserException();
    return user;
  }
}
