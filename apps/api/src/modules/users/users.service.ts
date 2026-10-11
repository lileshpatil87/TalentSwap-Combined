import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@talentswap/types';
import { USERS_REPOSITORY } from './users.constants';
import type { UsersRepository, UserRecord, UserUpdateInput } from './users.repository';
import { UserEmailConflictException, UserNotFoundException, UserOwnershipException } from './users.exceptions';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY) private readonly repository: UsersRepository) {}

  async getById(id: string): Promise<UserRecord> {
    const user = await this.repository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  async getAuthenticatedUser(id: string): Promise<UserRecord> { return this.getById(id); }

  async update(id: string, actorId: string, actorRole: Role, input: UserUpdateInput): Promise<UserRecord> {
    if (actorId !== id && actorRole !== Role.ADMIN) throw new UserOwnershipException();
    if (input.email) {
      const existing = await this.repository.findByEmail(input.email);
      if (existing && existing.id !== id) throw new UserEmailConflictException();
    }
    const safeInput: UserUpdateInput = actorRole === Role.ADMIN ? input : (input.email ? { email: input.email } : {});
    return this.repository.update(id, safeInput);
  }

  async deactivate(id: string, actorId: string, actorRole: Role): Promise<void> {
    if (actorId !== id && actorRole !== Role.ADMIN) throw new UserOwnershipException();
    await this.getById(id);
    await this.repository.delete(id);
  }

  async count(){return this.repository.count();}
  async listForAdmin(page=1,limit=20){return this.repository.list(page,limit);}

  async assertActive(id: string): Promise<UserRecord> {
    const user = await this.getById(id);
    if (user.isBanned) throw new UserOwnershipException();
    return user;
  }
}
