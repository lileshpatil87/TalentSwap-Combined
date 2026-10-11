import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../interfaces/authenticated-request.interface';

/**
 * Injects the authenticated user attached to the request by the (future)
 * `JwtAuthGuard` + `JwtStrategy` pairing owned by the `auth` module.
 *
 * Usage: `findOne(@CurrentUser() user: AuthenticatedUser)`, or
 * `@CurrentUser('id') userId: string` to extract a single field.
 */
export const CurrentUser = createParamDecorator(
  (
    field: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return field ? user?.[field] : user;
  },
);
