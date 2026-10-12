import { DeveloperApiService } from './developer-api.service';

describe('DeveloperApiService', () => {
  it('returns a one-time raw key but persists only its digest', async () => {
    const create = jest.fn(async ({ data }: any) => ({ id: 'key-id', name: data.name, scopes: data.scopes, createdAt: new Date(), expiresAt: data.expiresAt }));
    const service = new DeveloperApiService({ developerApiKey: { create } } as any, {} as any);
    const result = await service.createKey('owner-id', 'Integration');
    expect(result.apiKey).toMatch(/^tsk_live_/);
    expect(create.mock.calls[0][0].data.keyHash).toHaveLength(64);
    expect(create.mock.calls[0][0].data.keyHash).not.toBe(result.apiKey);
    expect(result.scopes).toContain('skills:read');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('rejects malformed and revoked credentials', async () => {
    const service = new DeveloperApiService({ developerApiKey: { findUnique: jest.fn(async () => ({ owner: { isBanned: false }, revokedAt: new Date(), expiresAt: null, scopes: ['skills:read'], keyHash: 'a'.repeat(64), lastUsedAt: new Date() })) } } as any, {} as any);
    await expect(service.authenticate(undefined)).rejects.toThrow('A valid x-api-key header is required.');
    await expect(service.authenticate(`tsk_live_${'x'.repeat(40)}`)).rejects.toThrow('API key is invalid, expired, revoked, or lacks scope.');
  });
});
