import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Role } from '../enums/role.enum';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Checks that `request.user.role` (attached by `JwtAuthGuard` upstream)
 * is one of the roles a route declares via `@Roles(...)`.
 *
 * Per Architecture Foundation §13 rule 3 / Backend Constitution §31:
 * "the guard checks role; the service checks ownership. Neither alone is
 * sufficient, and neither substitutes for the other." This guard is the
 * role half only — a service-layer ownership check (e.g. a user editing
 * "their" skill listing) is the owning module's responsibility, not this
 * guard's.
 *
 * A route with no `@Roles(...)` decorator is treated as open to any
 * authenticated role — `RolesGuard` only restricts, it never
 * authenticates (that is `JwtAuthGuard`'s job, applied first).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.role;

    return !!userRole && requiredRoles.includes(userRole);
  }
}
