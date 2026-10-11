import { UsersService } from './users.service';
import { Role } from '@talentswap/types';
import { UserOwnershipException, UserNotFoundException } from './users.exceptions';

describe('UsersService', () => {
  const repo = { findById: jest.fn(), findByEmail: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const service = new UsersService(repo as any);
  beforeEach(() => jest.clearAllMocks());
  it('retrieves an authenticated user', async () => { repo.findById.mockResolvedValue({ id:'u1' }); await expect(service.getAuthenticatedUser('u1')).resolves.toEqual({id:'u1'}); });
  it('fails when missing', async () => { repo.findById.mockResolvedValue(null); await expect(service.getById('u1')).rejects.toBeInstanceOf(UserNotFoundException); });
  it('enforces ownership', async () => { await expect(service.update('u1','u2',Role.USER,{})).rejects.toBeInstanceOf(UserOwnershipException); });
  it('allows admin update', async () => { repo.findById.mockResolvedValue({id:'u1'}); repo.update.mockResolvedValue({id:'u1'}); await expect(service.update('u1','admin',Role.ADMIN,{isBanned:true})).resolves.toEqual({id:'u1'}); });
});
