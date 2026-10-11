import { SetMetadata } from '@nestjs/common';

import { METADATA_KEYS } from '../constants/app.constants';
import type { Role } from '../enums/role.enum';

export const ROLES_KEY = METADATA_KEYS.ROLES;

/**
 * Marks a route as requiring one of the given roles. Consumed by
 * `RolesGuard` (Architecture Foundation §13 rule 3: "the guard checks
 * role, the service checks ownership — neither alone is sufficient").
 *
 * Usage: `@Roles(Role.Moderator, Role.Admin)`.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
