import { generateKeyPairSync } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { Role } from '@talentswap/types';

import { TokenService } from './token.service';

// Generated once per test run — a fresh, disposable 2048-bit RS256
// keypair with no relationship to the dev keypair committed in
// `.env.example`. Never reused outside this file.
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const authConfig = {
  jwtPrivateKey: privateKey,
  jwtPublicKey: publicKey,
  jwtIssuer: 'talentswap-api-test',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlDays: 30,
  refreshTokenCookieName: 'talentswap_refresh_token',
  bcryptSaltRounds: 4,
};

function configFor(nodeEnv: string): { get: (key: string) => unknown } {
  return {
    get: (key: string) => (key === 'auth' ? authConfig : { nodeEnv, apiPrefix: 'api/v1' }),
  };
}

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [TokenService, { provide: ConfigService, useValue: configFor('test') }],
    }).compile();

    service = module.get(TokenService);
  });

  describe('signAccessToken / verification', () => {
    it('signs a token that verifies against the matching public key', () => {
      const jwtService = new JwtService();
      const user = { id: 'user-1', email: 'a@example.com', role: Role.USER };

      const { accessToken, expiresIn } = service.signAccessToken(user);

      expect(expiresIn).toBe(900);

      const payload = jwtService.verify<{ sub: string; email: string; role: string }>(accessToken, {
        publicKey,
        algorithms: ['RS256'],
        issuer: 'talentswap-api-test',
      });
      expect(payload).toMatchObject({ sub: 'user-1', email: 'a@example.com', role: Role.USER });
    });

    it('rejects verification with the wrong public key', () => {
      const jwtService = new JwtService();
      const { publicKey: otherPublicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const { accessToken } = service.signAccessToken({
        id: 'user-1',
        email: 'a@example.com',
        role: Role.USER,
      });

      expect(() => {
        jwtService.verify(accessToken, { publicKey: otherPublicKey, algorithms: ['RS256'] });
      }).toThrow();
    });

    it('rejects an expired token', () => {
      const jwtService = new JwtService();
      const expiredToken = jwtService.sign(
        { sub: 'user-1', email: 'a@example.com', role: Role.USER },
        { privateKey, algorithm: 'RS256', expiresIn: -10, issuer: 'talentswap-api-test' },
      );

      expect(() => {
        jwtService.verify(expiredToken, { publicKey, algorithms: ['RS256'] });
      }).toThrow(/expired/i);
    });
  });

  describe('generateRefreshToken / hashRefreshToken', () => {
    it('generates a raw token whose hash matches hashRefreshToken(raw)', () => {
      const { raw, hash } = service.generateRefreshToken();

      expect(service.hashRefreshToken(raw)).toBe(hash);
    });

    it('never persists the raw value anywhere derivable from the hash', () => {
      const { raw, hash } = service.generateRefreshToken();

      expect(hash).not.toContain(raw);
      expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex digest
    });

    it('produces a different raw token on every call', () => {
      const first = service.generateRefreshToken();
      const second = service.generateRefreshToken();

      expect(first.raw).not.toBe(second.raw);
    });

    it('sets expiresAt roughly refreshTokenTtlDays in the future', () => {
      const before = Date.now();
      const { expiresAt } = service.generateRefreshToken();
      const expectedMs = 30 * 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 5000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(before + expectedMs + 5000);
    });
  });

  describe('refresh cookie policy', () => {
    it('is Secure outside development/test', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [JwtModule.register({})],
        providers: [TokenService, { provide: ConfigService, useValue: configFor('production') }],
      }).compile();
      const prodService = module.get(TokenService);

      const options = prodService.getRefreshCookieOptions();
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
    });

    it('is not Secure in local development (so the cookie survives plain HTTP)', () => {
      const options = service.getRefreshCookieOptions();
      expect(options.secure).toBe(false);
    });

    it('scopes the cookie path to the versioned auth prefix', () => {
      const options = service.getRefreshCookieOptions();
      expect(options.path).toBe('/api/v1/auth');
    });

    it('clear-cookie options mirror the set-cookie options minus maxAge', () => {
      const setOptions = service.getRefreshCookieOptions();
      const clearOptions = service.getRefreshCookieClearOptions();

      expect(clearOptions).toEqual({
        httpOnly: setOptions.httpOnly,
        secure: setOptions.secure,
        sameSite: setOptions.sameSite,
        path: setOptions.path,
      });
    });
  });
});
