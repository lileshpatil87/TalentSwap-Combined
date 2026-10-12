import { BadRequestException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  const prisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const passwords = { hash: jest.fn() };
  const config = { get: jest.fn((key: string) => key === 'email' ? { resendApiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, appPublicUrl: process.env.APP_PUBLIC_URL } : undefined) };
  const service = new PasswordResetService(prisma, passwords as any, config as any);
  const envBefore = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, url: process.env.APP_PUBLIC_URL };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 'test-key'; process.env.EMAIL_FROM = 'TalentSwap <noreply@example.com>'; process.env.APP_PUBLIC_URL = 'http://localhost:3000';
    config.get.mockImplementation((key: string) => key === 'email' ? { resendApiKey: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, appPublicUrl: process.env.APP_PUBLIC_URL } : undefined);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;
  });
  afterAll(() => {
    if (envBefore.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = envBefore.key;
    if (envBefore.from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = envBefore.from;
    if (envBefore.url === undefined) delete process.env.APP_PUBLIC_URL; else process.env.APP_PUBLIC_URL = envBefore.url;
    global.fetch = originalFetch;
  });

  it('returns a generic response for an unknown email without creating a token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.request('missing@example.com');
    expect(result.message).toContain('If an account exists');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('creates only a hashed, expiring token and sends a reset email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'person@example.com' });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-1' });
    const result = await service.request('person@example.com');
    expect(result.message).toContain('If an account exists');
    const token = prisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(token.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(token)).not.toContain('token=');
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }));
  });

  it('rejects expired reset tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'token-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() - 1000) });
    await expect(service.reset('a'.repeat(43), 'StrongPass123')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('atomically consumes a valid token, changes the password and revokes refresh tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'token-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() + 60000) });
    passwords.hash.mockResolvedValue('new-password-hash');
    const tx = {
      passwordResetToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { update: jest.fn().mockResolvedValue({}) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma.$transaction.mockImplementation((callback: (client: any) => unknown) => callback(tx));
    await expect(service.reset('a'.repeat(43), 'StrongPass123')).resolves.toMatchObject({ message: expect.stringContaining('successfully') });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { passwordHash: 'new-password-hash' } });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', isRevoked: false }, data: { isRevoked: true } });
  });
});
