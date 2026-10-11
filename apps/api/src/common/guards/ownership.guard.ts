import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Base class for per-resource ownership guards.
 *
 * Architecture Foundation §13 rule 3 is explicit that role and ownership
 * are two *separate* checks — `RolesGuard` covers the former; this class
 * is the extension point for the latter ("a user editing 'their' skill
 * listing"). Since resolving *which* record's owner to check is inherently
 * business-specific (skills use `skill.userId`, documents use
 * `document.userId`, ...), Foundation provides only the shared
 * request/response plumbing — a domain module extends this class and
 * implements `resolveOwnerId()` against its own repository:
 *
 *   @Injectable()
 *   export class SkillOwnershipGuard extends OwnershipGuard {
 *     constructor(private readonly skills: SkillsRepository) { super(); }
 *     protected async resolveOwnerId(request: AuthenticatedRequest) {
 *       const skill = await this.skills.findById(request.params.id);
 *       return skill?.userId ?? null;
 *     }
 *   }
 *
 * This file intentionally contains no business logic — `resolveOwnerId`
 * is abstract and throws if not overridden, so this class can exist in
 * Foundation without any domain module yet built on top of it.
 */
@Injectable()
export abstract class OwnershipGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      return false;
    }

    const ownerId = await this.resolveOwnerId(request);

    if (ownerId === null) {
      // Resource not found is a 404 concern, not a 403 concern — let the
      // service layer raise `ResourceNotFoundException`. This guard only
      // decides "may this authenticated user act on this resource,
      // assuming it exists."
      return true;
    }

    if (ownerId !== userId) {
      throw new ForbiddenException('You do not own this resource.');
    }

    return true;
  }

  /**
   * Resolve the owning user's ID for the resource identified by the
   * current request, or `null` if the resource does not exist / ownership
   * is not yet determinable at this layer.
   */
  protected abstract resolveOwnerId(request: AuthenticatedRequest): Promise<string | null>;
}
