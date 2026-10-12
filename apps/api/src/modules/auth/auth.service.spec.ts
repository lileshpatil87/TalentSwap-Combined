import { Test, type TestingModule } from '@nestjs/testing';

import { Role } from '@talentswap/types';

import { AUTH_REPOSITORY } from './auth.constants';
import {
  AccountBannedException,
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from './auth.exceptions';
import type { AuthRepository, AuthUserRecord, RefreshTokenRecord } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { ProfilesService } from '../profiles/profiles.service';

function buildUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'user-1',
    email: 'person@example.com',
    passwordHash: 'stored-hash',
    role: Role.USER,
    isEmailVerified: false,
    isBanned: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildRefreshToken(overrides: Partial<RefreshTokenRecord> = {}): RefreshTokenRecord {
  return {
    id: 'token-1',
    userId: 'user-1',
    tokenHash: 'hashed-value',
    familyId: 'family-1',
    isRevoked: false,
    replacedByTokenId: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let profiles: { getOrCreate: jest.Mock };

  beforeEach(async () => {
    repository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      createRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeRefreshTokenFamily: jest.fn(),
    };

    passwordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<PasswordService>;

    tokenService = {
      signAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      hashRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    profiles = { getOrCreate: jest.fn().mockResolvedValue({ id: 'user-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_REPOSITORY, useValue: repository },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
        { provide: ProfilesService, useValue: profiles },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('creates a user and issues a session when the email is unused', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      repository.createUser.mockResolvedValue(buildUser());
      tokenService.signAccessToken.mockReturnValue({ accessToken: 'jwt', expiresIn: 900 });
      tokenService.generateRefreshToken.mockReturnValue({
        raw: 'raw-refresh',
        hash: 'hashed-refresh',
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      });
      repository.createRefreshToken.mockResolvedValue(buildRefreshToken());

      const result = await service.register({
        email: 'person@example.com',
        password: 'correct horse',
      });

      expect(passwordService.hash).toHaveBeenCalledWith('correct horse');
      expect(profiles.getOrCreate).toHaveBeenCalledWith('user-1');
      expect(repository.createUser).toHaveBeenCalledWith({
        email: 'person@example.com',
        passwordHash: 'hashed-password',
      });
      expect(result.accessToken).toBe('jwt');
      expect(result.refreshToken).toBe('raw-refresh');
      expect(result.user).toEqual({ id: 'user-1', email: 'person@example.com', role: Role.USER });
    });

    it('rejects registration when the email is already in use', async () => {
      repository.findUserByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({ email: 'person@example.com', password: 'whatever1' }),
      ).rejects.toBeInstanceOf(EmailAlreadyRegisteredException);
      expect(repository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a session for correct credentials', async () => {
      const user = buildUser();
      repository.findUserByEmail.mockResolvedValue(user);
      passwordService.verify.mockResolvedValue(true);
      tokenService.signAccessToken.mockReturnValue({ accessToken: 'jwt', expiresIn: 900 });
      tokenService.generateRefreshToken.mockReturnValue({
        raw: 'raw-refresh',
        hash: 'hashed-refresh',
        expiresAt: new Date('2026-02-01T00:00:00Z'),
      });
      repository.createRefreshToken.mockResolvedValue(buildRefreshToken());

      const result = await service.login({ email: user.email, password: 'correct horse' });

      expect(result.accessToken).toBe('jwt');
    });

    it('rejects an unknown email with the generic invalid-credentials error', async () => {
      repository.findUserByEmail.mockResolvedValue(null);
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever1' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('rejects a wrong password with the SAME generic error as an unknown email', async () => {
      repository.findUserByEmail.mockResolvedValue(buildUser());
      passwordService.verify.mockResolvedValue(false);

      const unknownEmailError = await service
        .login({ email: 'nobody@example.com', password: 'x' })
        .catch((error: unknown) => error);
      const wrongPasswordError = await service
        .login({ email: 'person@example.com', password: 'wrong' })
        .catch((error: unknown) => error);

      expect(unknownEmailError).toBeInstanceOf(InvalidCredentialsException);
      expect(wrongPasswordError).toBeInstanceOf(InvalidCredentialsException);
      expect((unknownEmailError as InvalidCredentialsException).message).toBe(
        (wrongPasswordError as InvalidCredentialsException).message,
      );
    });

    it('rejects a banned account even with correct credentials', async () => {
      repository.findUserByEmail.mockResolvedValue(buildUser({ isBanned: true }));
      passwordService.verify.mockResolvedValue(true);

      await expect(
        service.login({ email: 'person@example.com', password: 'correct horse' }),
      ).rejects.toBeInstanceOf(AccountBannedException);
    });
  });

  describe('refresh', () => {
    it('rotates a valid token and returns a new session', async () => {
      const existing = buildRefreshToken();
      repository.findRefreshTokenByHash.mockResolvedValue(existing);
      repository.findUserById.mockResolvedValue(buildUser());
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');
      tokenService.generateRefreshToken.mockReturnValue({
        raw: 'new-raw',
        hash: 'new-hash',
        expiresAt: new Date('2026-03-01T00:00:00Z'),
      });
      repository.rotateRefreshToken.mockResolvedValue(
        buildRefreshToken({ id: 'token-2', tokenHash: 'new-hash' }),
      );
      tokenService.signAccessToken.mockReturnValue({ accessToken: 'new-jwt', expiresIn: 900 });

      const result = await service.refresh('raw-old-token');

      expect(repository.rotateRefreshToken).toHaveBeenCalledWith(
        'token-1',
        expect.objectContaining({ familyId: 'family-1', tokenHash: 'new-hash' }),
      );
      expect(result.accessToken).toBe('new-jwt');
      expect(result.refreshToken).toBe('new-raw');
    });

    it('rejects an unknown token', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(null);
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');

      await expect(service.refresh('bogus')).rejects.toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('rejects an expired token without revoking the family', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(
        buildRefreshToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');

      await expect(service.refresh('expired')).rejects.toBeInstanceOf(InvalidRefreshTokenException);
      expect(repository.revokeRefreshTokenFamily).not.toHaveBeenCalled();
    });

    it('revokes the entire family when an already-revoked token is replayed', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(
        buildRefreshToken({ isRevoked: true, familyId: 'family-under-attack' }),
      );
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');

      await expect(service.refresh('stolen-and-reused')).rejects.toBeInstanceOf(
        InvalidRefreshTokenException,
      );
      expect(repository.revokeRefreshTokenFamily).toHaveBeenCalledWith('family-under-attack');
    });

    it('rejects refresh for a now-banned user', async () => {
      repository.findRefreshTokenByHash.mockResolvedValue(buildRefreshToken());
      repository.findUserById.mockResolvedValue(buildUser({ isBanned: true }));
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');

      await expect(service.refresh('raw-old-token')).rejects.toBeInstanceOf(AccountBannedException);
    });
  });

  describe('logout', () => {
    it('revokes the token when found and not already revoked', async () => {
      const existing = buildRefreshToken();
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');
      repository.findRefreshTokenByHash.mockResolvedValue(existing);

      await service.logout('raw-token');

      expect(repository.revokeRefreshToken).toHaveBeenCalledWith('token-1');
    });

    it('is a no-op when no cookie was presented', async () => {
      await service.logout(undefined);

      expect(repository.findRefreshTokenByHash).not.toHaveBeenCalled();
    });

    it('is a no-op (not an error) for an already-revoked or unknown token', async () => {
      tokenService.hashRefreshToken.mockReturnValue('hashed-value');
      repository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(service.logout('already-gone')).resolves.toBeUndefined();
      expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });
});
