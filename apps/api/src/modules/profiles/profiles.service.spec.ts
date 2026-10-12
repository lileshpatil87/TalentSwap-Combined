import { Role } from '@talentswap/types';
import { ProfilesService } from './profiles.service';
import { ProfileOwnershipException } from './profiles.exceptions';

describe('ProfilesService', () => {
  const repository = {
    findByUserId: jest.fn(), create: jest.fn(), update: jest.fn(), markVerified: jest.fn(),
    updateReputation: jest.fn(), addExperience: jest.fn(), touch: jest.fn(),
  };
  const users = { getById: jest.fn() };
  const settings = { getProfileVisibility: jest.fn().mockResolvedValue('PUBLIC') };
  const service = new ProfilesService(repository as any, users as any, settings as any);

  beforeEach(() => { jest.clearAllMocks(); settings.getProfileVisibility.mockResolvedValue('PUBLIC'); });

  it('returns the authenticated user profile from the repository, not a demo identity', async () => {
    repository.findByUserId.mockResolvedValue({
      id: 'profile-1', userId: 'user-1', displayName: 'Sujay', headline: 'Developer', bio: null,
      avatarUrl: null, location: null, availability: null, timezone: null, languages: [],
      skillPoints: 0, reputationScore: 0, totalExchanges: 0, isVerified: false,
      verificationBadge: null, experienceLevel: 'BEGINNER', experiencePoints: 0,
      lastActiveAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    users.getById.mockResolvedValue({ id: 'user-1', email: 'sujay@example.com', role: Role.USER, createdAt: new Date('2026-01-01T00:00:00Z') });

    const result = await service.getOrCreate('user-1');

    expect(result.id).toBe('user-1');
    expect(result.name).toBe('Sujay');
    expect(result.email).toBe('sujay@example.com');
    expect(result.name).not.toBe('Alex Morgan');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a profile from the actual account email when no profile exists', async () => {
    repository.findByUserId.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'profile-1', userId: 'user-2', displayName: 'jane doe', headline: null, bio: null,
      avatarUrl: null, location: null, availability: null, timezone: null, languages: [],
      skillPoints: 0, reputationScore: 0, totalExchanges: 0, isVerified: false,
      verificationBadge: null, experienceLevel: 'BEGINNER', experiencePoints: 0,
      lastActiveAt: null, createdAt: new Date(), updatedAt: new Date(),
    });
    users.getById.mockResolvedValue({ id: 'user-2', email: 'jane.doe@example.com', role: Role.USER, createdAt: new Date('2026-01-01T00:00:00Z') });
    repository.create.mockResolvedValue({
      id: 'profile-1', userId: 'user-2', displayName: 'jane doe', headline: null, bio: null,
      avatarUrl: null, location: null, availability: null, timezone: null, languages: [],
      skillPoints: 0, reputationScore: 0, totalExchanges: 0, isVerified: false,
      verificationBadge: null, experienceLevel: 'BEGINNER', experiencePoints: 0,
      lastActiveAt: null, createdAt: new Date(), updatedAt: new Date(),
    });

    const result = await service.getOrCreate('user-2');

    expect(repository.create).toHaveBeenCalledWith('user-2', 'jane doe');
    expect(result.id).toBe('user-2');
    expect(result.name).toBe('jane doe');
  });


  it('hides member-only profiles from anonymous visitors without revealing their existence', async () => {
    repository.findByUserId.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
    settings.getProfileVisibility.mockResolvedValue('MEMBERS');
    const { ProfileNotFoundException } = await import('./profiles.exceptions');
    await expect(service.getByUserId('user-1', true)).rejects.toBeInstanceOf(ProfileNotFoundException);
  });

  it('rejects a profile update when the actor does not own the profile', async () => {
    await expect(service.update('user-1', 'user-2', Role.USER, { displayName: 'Intruder' }))
      .rejects.toBeInstanceOf(ProfileOwnershipException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('only persists allowed profile fields and strips HTML from the bio', async () => {
    const profile = {
      id: 'profile-1', userId: 'user-1', displayName: 'Sujay', headline: null, bio: 'Hello',
      avatarUrl: null, location: null, availability: null, timezone: null, languages: [],
      skillPoints: 0, reputationScore: 0, totalExchanges: 0, isVerified: false,
      verificationBadge: null, experienceLevel: 'BEGINNER', experiencePoints: 0,
      lastActiveAt: null, createdAt: new Date(), updatedAt: new Date(),
    };
    repository.findByUserId.mockResolvedValue(profile);
    users.getById.mockResolvedValue({ id: 'user-1', email: 'sujay@example.com', role: Role.USER, createdAt: new Date('2026-01-01T00:00:00Z') });
    repository.update.mockResolvedValue(profile);

    await service.update('user-1', 'user-1', Role.USER, {
      displayName: ' Sujay ', bio: '<script>alert(1)</script>Hello', role: Role.ADMIN,
      skillPoints: 999999, isVerified: true,
    });

    expect(repository.update).toHaveBeenCalledWith('user-1', {
      displayName: 'Sujay', bio: 'Hello',
    });
  });
});
