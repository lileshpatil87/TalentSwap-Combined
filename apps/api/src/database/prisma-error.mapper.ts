import { Prisma } from '@prisma/client';

import {
  DomainException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../common/exceptions/domain.exception';

/**
 * Maps Prisma's `PrismaClientKnownRequestError` codes to this platform's
 * `DomainException` subclasses, so a repository catch block never has to
 * hand-translate a raw Prisma error code into a `code`/status pair itself
 * (Backend Constitution §26: expected failures are thrown as typed
 * `DomainException`s, never left as a raw driver error for the caller to
 * interpret).
 *
 * Added per the 2026-08 integration review's cherry-pick recommendation.
 * This is generic, cross-module Prisma-error-shape knowledge — not
 * business logic — so it lives in `database/`, alongside `PrismaService`,
 * rather than in any one domain module.
 *
 * Usage in a repository:
 *   try {
 *     return await this.prisma.skill.create({ data });
 *   } catch (error) {
 *     throw mapPrismaError(error, { resource: 'Skill' });
 *   }
 *
 * Only the handful of codes every module is likely to hit are mapped.
 * A module that needs to distinguish a code not listed here (e.g. to
 * attach richer `details`) catches it and maps it locally — this
 * function's job is to cover the common case, not every code.
 */
export function mapPrismaError(
  error: unknown,
  context: { resource: string } = { resource: 'Resource' },
): DomainException | unknown {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return error;
  }

  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation.
      const target = (error.meta?.target as string[] | undefined)?.join(', ');
      return new ResourceConflictException(
        `${context.resource} with the given ${target ?? 'value'} already exists.`,
        target ? { conflictingFields: target } : undefined,
      );
    }

    case 'P2025':
      // Record required (e.g. update/delete) but not found.
      return new ResourceNotFoundException(context.resource);

    case 'P2003': {
      // Foreign key constraint violation.
      const field = error.meta?.field_name as string | undefined;
      return new ResourceConflictException(
        `${context.resource} references a related record that does not exist.`,
        field ? { field } : undefined,
      );
    }

    default:
      // Not a code we have a specific mapping for — let it propagate to
      // GlobalExceptionFilter's generic 500 path rather than guessing.
      return error;
  }
}
