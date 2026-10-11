import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { AuthConfig } from '@app/config/configuration';
import { ProfilesModule } from '../profiles/profiles.module';

import { AUTH_REPOSITORY } from './auth.constants';
import { AuthController } from './auth.controller';
import { PrismaAuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

/**
 * The `auth` domain module (Architecture Foundation §3.1, Backend
 * Constitution §6). Owns `users` + `refresh_tokens` (identity only) and
 * is the module every other module's `@Roles()`/`@CurrentUser()` usage
 * ultimately depends on being wired correctly.
 *
 * `PassportModule.register({ defaultStrategy: 'jwt' })` and `JwtStrategy`
 * live here, not in `AppModule` — Passport wiring is an `auth` concern
 * (see `common/guards/jwt-auth.guard.ts`'s header comment for how this
 * connects to the globally-registered `JwtAuthGuard`).
 *
 * `JwtModule.registerAsync` supplies `TokenService`'s injected
 * `JwtService` with the RS256 keypair from `AuthConfig` — registered
 * async (reading from `ConfigService`) rather than a static `register()`
 * call, consistent with this app's fail-fast, validated-at-boot
 * configuration model (Architecture Foundation §8.2).
 */
@Module({
  imports: [
    ProfilesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthConfig>('auth')!;
        return {
          privateKey: authConfig.jwtPrivateKey,
          publicKey: authConfig.jwtPublicKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: authConfig.accessTokenTtlSeconds,
            issuer: authConfig.jwtIssuer,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository },
  ],
  exports: [TokenService],
})
export class AuthModule {}
