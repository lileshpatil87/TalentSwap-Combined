import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '@talentswap/types';

import type { AuthConfig } from '@app/config/configuration';

import type { JwtAccessTokenPayload } from '../token.service';

/**
 * Registers the `'jwt'` Passport strategy that `JwtAuthGuard`
 * (`AuthGuard('jwt')`, `common/guards/jwt-auth.guard.ts`) delegates to.
 *
 * Verification is RS256, public-key-only (Spec §2.2.4 — "verified with
 * the public key... distributed to multiple services without exposing
 * the signing authority"), and `validate()` does no database lookup: the
 * whole point of a stateless access token is that authenticating a
 * request costs zero DB round-trips (Spec §2.2.4). This means a change to
 * a user's role or a ban takes effect on that user's NEXT token refresh
 * (at most `JWT_ACCESS_TOKEN_TTL_SECONDS`, 15 minutes by default) rather
 * than instantly — an accepted, deliberate trade-off already made by the
 * architecture, not one this class re-litigates.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const authConfig = configService.get<AuthConfig>('auth')!;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtPublicKey,
      algorithms: ['RS256'],
      issuer: authConfig.jwtIssuer,
    });
  }

  /**
   * Called by Passport only after signature, expiry, and issuer have all
   * verified successfully — a failure at any of those stages short-circuits
   * to `JwtAuthGuard`'s default `UnauthorizedException` before this method
   * ever runs (Backend Constitution §31 "deny by default").
   */
  validate(payload: JwtAccessTokenPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
