import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import type { AuthenticatedUser, AuthSessionResponse } from '@talentswap/types';

import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { RateLimit } from '@app/common/decorators/rate-limit.decorator';

import { InvalidRefreshTokenException } from './auth.exceptions';
import { AuthService, type AuthSessionResult } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './token.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetService } from './password-reset.service';

/**
 * `auth` module's sole controller (Backend Constitution §8 — "a module
 * has one primary controller unless a genuinely distinct sub-resource
 * justifies a second"; nothing here does). Every method body is
 * validation-binding (via the DTO parameter, already validated by
 * `ZodValidationPipe` before the method runs) + exactly one `AuthService`
 * call + a return — no business logic, no direct `PrismaService` access,
 * no hand-rolled try/catch (`GlobalExceptionFilter` owns that) or
 * response envelope construction (`ResponseTransformInterceptor` owns
 * that).
 *
 * `@Res({ passthrough: true })` is used, not bare `@Res()`, specifically
 * so those two global interceptors keep applying — passthrough mode only
 * grants access to the underlying Express `Response` for setting the
 * refresh-token cookie, it does not take over the response lifecycle.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Public()
  @RateLimit('auth')
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const session = await this.authService.register(dto);
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  @Public()
  @RateLimit('auth')
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const session = await this.authService.login(dto);
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }


  @Public()
  @RateLimit('auth')
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    try { return await this.passwordReset.request(dto.email); }
    catch (error) {
      if (error instanceof Error && error.message === 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED') {
        throw new ServiceUnavailableException('Password reset email delivery is not configured. Please contact the administrator.');
      }
      throw error;
    }
  }

  @Public()
  @RateLimit('auth')
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.passwordReset.reset(dto.token, dto.password);
  }

  /**
   * No request body: the refresh token travels exclusively as the
   * httpOnly cookie set by `register`/`login`/a previous `refresh`
   * (Spec §2.2.4/§8.2) — accepting it in the body as well would give an
   * XSS-exposed alternate path to the same secret the cookie exists to
   * protect.
   */
  @Public()
  @RateLimit('auth')
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const rawRefreshToken = req.cookies?.[this.tokenService.refreshTokenCookieName] as
      string | undefined;

    if (!rawRefreshToken) {
      // Same generic outcome as any other invalid token — see
      // `auth.exceptions.ts` on why this never says "missing" vs "invalid".
      throw new InvalidRefreshTokenException();
    }

    const session = await this.authService.refresh(rawRefreshToken);
    this.setRefreshCookie(res, session);
    return this.toResponse(session);
  }

  /**
   * Idempotent and deliberately `@Public()`: a client whose access token
   * has already expired must still be able to log out and clear its
   * refresh cookie (Backend Constitution §31 notwithstanding — this is
   * the one auth endpoint where "no valid access token" is an expected,
   * not exceptional, caller state).
   */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[this.tokenService.refreshTokenCookieName] as
      string | undefined;

    await this.authService.logout(rawRefreshToken);
    res.clearCookie(
      this.tokenService.refreshTokenCookieName,
      this.tokenService.getRefreshCookieClearOptions(),
    );
  }

  /**
   * Minimal authenticated smoke-test endpoint demonstrating the full
   * guard pipeline (`JwtAuthGuard` → `@CurrentUser()`). Returns exactly
   * what the access token asserts — no database read (Spec §2.2.4) — so
   * this is intentionally NOT a substitute for a future `profiles`
   * module's "my profile" endpoint.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private setRefreshCookie(res: Response, session: AuthSessionResult): void {
    res.cookie(
      this.tokenService.refreshTokenCookieName,
      session.refreshToken,
      this.tokenService.getRefreshCookieOptions(
        session.refreshTokenExpiresAt.getTime() - Date.now(),
      ),
    );
  }

  private toResponse(session: AuthSessionResult): AuthSessionResponse {
    return {
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresIn: session.accessTokenExpiresIn,
    };
  }
}
