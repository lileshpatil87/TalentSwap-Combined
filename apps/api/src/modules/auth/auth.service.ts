import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Role } from '@talentswap/types';

import { generateUuid } from '@app/common/utils/uuid.util';

import { AUTH_LOG_CONTEXT, AUTH_REPOSITORY } from './auth.constants';
import {
  AccountBannedException,
  EmailAlreadyRegisteredException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from './auth.exceptions';
import type { AuthRepository, AuthUserRecord } from './auth.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { ProfilesService } from '../profiles/profiles.service';

/**
 * Result shape shared by register/login/refresh — everything a controller
 * needs to build the response body plus set the refresh cookie, without
 * the service knowing anything about Express (`Request`/`Response`).
 */
export interface AuthSessionResult {
  user: { id: string; email: string; role: Role };
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Business orchestration for the `auth` module (Backend Constitution §9).
 * Depends on the `AuthRepository` *interface* (Dependency Inversion,
 * §21), never on `PrismaAuthRepository` directly, and on `PasswordService`
 * / `TokenService` for their respective single responsibilities. This
 * class owns exactly one thing — deciding whether a register/login/
 * refresh/logout request succeeds — and delegates everything else.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AUTH_LOG_CONTEXT);

  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly profiles: ProfilesService,
  ) {}

  async register(input: { email: string; password: string }): Promise<AuthSessionResult> {
    const existing = await this.authRepository.findUserByEmail(input.email);
    if (existing) {
      // Pre-check for the common case; `PrismaAuthRepository.createUser`
      // also catches the underlying unique-constraint violation for the
      // rare concurrent-registration race — see that method's comment.
      throw new EmailAlreadyRegisteredException();
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.authRepository.createUser({ email: input.email, passwordHash });

    await this.profiles.getOrCreate(user.id);
    this.logger.log(`User registered: ${user.id}`);

    return this.issueSession(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthSessionResult> {
    const user = await this.authRepository.findUserByEmail(input.email);

    // Deliberately identical failure for "no such user" and "wrong
    // password" — see auth.exceptions.ts's header comment on
    // enumeration risk (Spec §8.1).
    const passwordMatches = await this.passwordService.verify(
      input.password,
      user?.passwordHash ?? null,
    );
    if (!user || !passwordMatches) {
      throw new InvalidCredentialsException();
    }

    if (user.isBanned) {
      this.logger.warn(`Login rejected for banned account: ${user.id}`);
      throw new AccountBannedException();
    }

    this.logger.log(`User logged in: ${user.id}`);

    return this.issueSession(user);
  }

  /**
   * Rotates a presented refresh token. Per Spec §8.2 / ADR-0003: a token
   * that is unknown, expired, or already revoked is rejected identically
   * (`InvalidRefreshTokenException`) — but if it was already revoked
   * (i.e. this exact token value is being presented a second time), that
   * specifically indicates theft/replay, so the entire token family is
   * revoked before rejecting, forcing the legitimate user to re-authenticate
   * the next time they (or the attacker) try to use any token from that
   * family.
   */
  async refresh(rawRefreshToken: string): Promise<AuthSessionResult> {
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const existingToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!existingToken) {
      throw new InvalidRefreshTokenException();
    }

    if (existingToken.isRevoked) {
      this.logger.warn(`Refresh-token reuse detected — revoking family ${existingToken.familyId}`);
      await this.authRepository.revokeRefreshTokenFamily(existingToken.familyId);
      throw new InvalidRefreshTokenException();
    }

    if (existingToken.expiresAt.getTime() <= Date.now()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(existingToken.userId);
    if (!user) {
      // The user row was deleted out from under a still-live refresh
      // token family — treat exactly like any other invalid token rather
      // than a 500; this is a legitimate (if rare) state, not a bug.
      throw new InvalidRefreshTokenException();
    }

    if (user.isBanned) {
      throw new AccountBannedException();
    }

    const newToken = this.tokenService.generateRefreshToken();
    const rotated = await this.authRepository.rotateRefreshToken(existingToken.id, {
      userId: user.id,
      tokenHash: newToken.hash,
      familyId: existingToken.familyId,
      expiresAt: newToken.expiresAt,
    });

    const { accessToken, expiresIn } = this.tokenService.signAccessToken(user);

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      accessTokenExpiresIn: expiresIn,
      refreshToken: newToken.raw,
      refreshTokenExpiresAt: rotated.expiresAt,
    };
  }

  /**
   * Revokes a single refresh token. Idempotent by design: an unknown or
   * already-revoked token is treated as "already logged out", not an
   * error — logout should never fail in a way that blocks the client from
   * clearing its own local session state.
   */
  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const existingToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!existingToken || existingToken.isRevoked) {
      return;
    }

    await this.authRepository.revokeRefreshToken(existingToken.id);
    this.logger.log(`User logged out: ${existingToken.userId}`);
  }

  private async issueSession(user: AuthUserRecord): Promise<AuthSessionResult> {
    const { accessToken, expiresIn } = this.tokenService.signAccessToken(user);
    const newToken = this.tokenService.generateRefreshToken();

    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: newToken.hash,
      familyId: generateUuid(),
      expiresAt: newToken.expiresAt,
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken,
      accessTokenExpiresIn: expiresIn,
      refreshToken: newToken.raw,
      refreshTokenExpiresAt: newToken.expiresAt,
    };
  }
}
