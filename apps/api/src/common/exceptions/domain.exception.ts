import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for every expected, business-meaningful failure a service
 * throws (Backend Constitution §26, Architecture Foundation §6.6).
 *
 * A service that can fail in a way the caller needs to distinguish
 * (insufficient balance, already confirmed, not found, ...) THROWS a
 * `DomainException` subclass — it never returns `null`/`false` and forces
 * the caller to guess why. `GlobalExceptionFilter` (common/filters) is the
 * single place that maps every thrown exception to the standard error
 * envelope (Architecture Foundation §9.2); no controller writes its own
 * try/catch-and-format logic.
 *
 * `code` is a stable, machine-readable `UPPER_SNAKE_CASE` string the
 * frontend can switch on. `details` is optional, structured, and never a
 * stack trace or internal error string.
 *
 * Domain modules define their own subclasses close to where they're
 * thrown (e.g. `wallet`'s `InsufficientBalanceException` carries code
 * `INSUFFICIENT_BALANCE`) — those do NOT belong in this foundation module.
 * Only the base class and a handful of truly generic, cross-module
 * subclasses live here.
 */
export abstract class DomainException extends HttpException {
  public abstract readonly code: string;

  protected constructor(
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}

/**
 * A request failed shape/type validation (Zod) before reaching a service.
 * Thrown by `ZodValidationPipe` — see common/pipes.
 */
export class ValidationException extends DomainException {
  public readonly code: string = 'VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.BAD_REQUEST, details);
  }
}

/**
 * Generic "the requested resource does not exist" failure. Per
 * Architecture Foundation §9.8, this is also used for "exists but the
 * caller has no access" on private resources — never leak existence via a
 * 403-vs-404 distinction.
 *
 * Named `ResourceNotFoundException` (not `NotFoundException`) to avoid
 * colliding with `@nestjs/common`'s built-in exception of the same name.
 */
export class ResourceNotFoundException extends DomainException {
  public readonly code: string = 'RESOURCE_NOT_FOUND';

  constructor(resource: string, identifier?: string | number) {
    super(
      identifier ? `${resource} '${identifier}' was not found.` : `${resource} was not found.`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Generic conflict — duplicate idempotency key, concurrent-edit conflict, etc. */
export class ResourceConflictException extends DomainException {
  public readonly code: string = 'RESOURCE_CONFLICT';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.CONFLICT, details);
  }
}

/** Authenticated, but not permitted to perform this specific action. */
export class ForbiddenActionException extends DomainException {
  public readonly code: string = 'FORBIDDEN_ACTION';

  constructor(message = 'You are not permitted to perform this action.') {
    super(message, HttpStatus.FORBIDDEN);
  }
}
