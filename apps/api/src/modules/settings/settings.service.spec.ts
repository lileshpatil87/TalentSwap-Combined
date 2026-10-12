import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const repository = { get: jest.fn(), update: jest.fn() };
  const service = new SettingsService(repository as any);
  beforeEach(() => jest.clearAllMocks());

  it('returns persistent settings for the authenticated user', async () => {
    const settings = { userId: 'user-1', emailNotifications: true, messageNotifications: false, marketingEmails: false, profileVisibility: 'MEMBERS' };
    repository.get.mockResolvedValue(settings);
    await expect(service.get('user-1')).resolves.toEqual(settings);
    expect(repository.get).toHaveBeenCalledWith('user-1');
  });

  it('persists only the supplied validated settings for the current user', async () => {
    const input = { emailNotifications: false, messageNotifications: true, marketingEmails: false, profileVisibility: 'PUBLIC' as const };
    repository.update.mockResolvedValue({ userId: 'user-1', ...input });
    await expect(service.update('user-1', input)).resolves.toMatchObject({ userId: 'user-1', ...input });
    expect(repository.update).toHaveBeenCalledWith('user-1', input);
  });
});
