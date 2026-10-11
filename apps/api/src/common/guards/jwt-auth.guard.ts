import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard.
 *
 * Per Architecture Foundation §13 rule 3 ("deny by default — every route
 * requires authentication unless explicitly decorated `@Public()`"), this
 * guard's `canActivate` override lets `@Public()`-decorated routes through
 * and otherwise delegates to Passport's `AuthGuard('jwt')`.
 *
 * This class was written, unchanged, during BE-01 (Backend Foundation) as
 * a deliberate extension point: BE-02 (Authentication Foundation)
 * completed the wiring it was left waiting for —
 *   1. `modules/auth/strategies/jwt.strategy.ts` registers the `'jwt'`
 *      Passport strategy (RS256 verification, payload → `AuthenticatedUser`).
 *   2. `AuthModule` imports `PassportModule.register({ defaultStrategy: 'jwt' })`.
 *   3. `app.module.ts` registers *this* guard as
 *      `{ provide: APP_GUARD, useClass: JwtAuthGuard }`, ahead of
 *      `RolesGuard` and `RateLimitGuard` in the global guard chain.
 * No change was needed in this file itself to complete that wiring.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
