import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';

import type { Role } from '@talentswap/types';

import { generateSecureToken, sha256Hex } from '@app/common/utils/crypto.util';
import type { AppConfig, AuthConfig } from '@app/config/configuration';

/**
 * Claims embedded in a signed access token. Deliberately minimal — the
 * whole point of a stateless access token (Technology Specification
 * §2.2.4: "validated at the API layer without a database round-trip") is
 * that it carries only what it itself asserts, never live profile/wallet
 * data owned by another module. `iat`/`exp`/`iss` are added by
 * `JwtService.sign()` itself from the options passed alongside this
 * payload, not written here.
 */
export interface JwtAccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface SignedAccessToken {
  accessToken: string;
  /** Seconds until expiry, for the response body (client-side refresh scheduling). */
  expiresIn: number;
}

export interface GeneratedRefreshToken {
  /** The only copy of the raw value that will ever exist outside the client's cookie jar. */
  raw: string;
  /** SHA-256 hex digest — what actually gets persisted (`RefreshToken.tokenHash`). */
  hash: string;
  expiresAt: Date;
}

/**
 * JWT + refresh-token primitives owned by the `auth` module (Backend
 * Constitution §30). Kept separate from `AuthService`'s register/login/
 * refresh/logout orchestration so each half is independently unit
 * testable and neither grows into a god-class.
 */
@Injectable()
export class TokenService {
  private readonly authConfig: AuthConfig;
  private readonly appConfig: AppConfig;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    // Read once at construction — config is immutable for the process
    // lifetime (Architecture Foundation §8.2 fail-fast-at-boot model).
    this.authConfig = configService.get<AuthConfig>('auth')!;
    this.appConfig = configService.get<AppConfig>('app')!;
  }

  /**
   * RS256-signed access token (Spec §2.2.4/§8.2). 15-minute default TTL,
   * configurable via `JWT_ACCESS_TOKEN_TTL_SECONDS`.
   */
  signAccessToken(user: { id: string; email: string; role: Role }): SignedAccessToken {
    const payload: JwtAccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      privateKey: this.authConfig.jwtPrivateKey,
      algorithm: 'RS256',
      expiresIn: this.authConfig.accessTokenTtlSeconds,
      issuer: this.authConfig.jwtIssuer,
    });

    return { accessToken, expiresIn: this.authConfig.accessTokenTtlSeconds };
  }

  /**
   * A new, cryptographically random refresh token (384 bits — Spec §8.2
   * "cryptographically random refresh token") plus its hash and expiry.
   * The caller (AuthRepository, via AuthService) persists only `hash` and
   * `expiresAt`; `raw` goes to the client and nowhere else.
   */
  generateRefreshToken(): GeneratedRefreshToken {
    const raw = generateSecureToken(48);
    const expiresAt = new Date(
      Date.now() + this.authConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    return { raw, hash: sha256Hex(raw), expiresAt };
  }

  /** Hash a client-presented raw refresh token for a `token_hash` lookup. */
  hashRefreshToken(raw: string): string {
    return sha256Hex(raw);
  }

  verifyAccessToken(token: string): JwtAccessTokenPayload {
    return this.jwtService.verify<JwtAccessTokenPayload>(token, {
      publicKey: this.authConfig.jwtPublicKey,
      algorithms: ['RS256'],
      issuer: this.authConfig.jwtIssuer,
    });
  }

  get refreshTokenCookieName(): string {
    return this.authConfig.refreshTokenCookieName;
  }

  /**
   * Cookie policy for the refresh token (Spec §2.2.4/§8.2): httpOnly
   * (never readable by JavaScript — the platform's primary XSS mitigation
   * for token theft), Secure outside local development (Secure cookies
   * are silently dropped by browsers over plain HTTP, which would break
   * `docker-compose`-based local dev), SameSite=Strict (no cross-site
   * requests carry it at all), and scoped to the versioned auth path only
   * — the cookie is never attached to unrelated API calls.
   */
  getRefreshCookieOptions(maxAgeOverrideMs?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.appConfig.nodeEnv !== 'development' && this.appConfig.nodeEnv !== 'test',
      sameSite: 'strict',
      path: `/${this.appConfig.apiPrefix}/auth`,
      maxAge: maxAgeOverrideMs ?? this.authConfig.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    };
  }

  /**
   * Options for clearing the cookie on logout. Express's `res.clearCookie`
   * matches on `path`/`domain`/`sameSite` — must mirror
   * `getRefreshCookieOptions()` exactly or the browser will not remove it.
   */
  getRefreshCookieClearOptions(): CookieOptions {
    const { httpOnly, secure, sameSite, path } = this.getRefreshCookieOptions();
    return { httpOnly, secure, sameSite, path };
  }
}
