import { HttpStatus } from '@nestjs/common';

import { DomainException } from '@app/common/exceptions/domain.exception';

/**
 * `auth`-owned `DomainException` subclasses (Backend Constitution §26,
 * Architecture Foundation §6.6). Each carries a stable, machine-readable
 * `code` that `GlobalExceptionFilter` maps into the standard error
 * envelope (Arch §9.2) unchanged — no controller here writes its own
 * try/catch-and-format logic.
 *
 * Security note on message wording (Technology Specification §8.1,
 * "authentication enumeration risks"): `InvalidCredentialsException` is
 * thrown for BOTH "no such email" and "email exists, wrong password" —
 * the message never reveals which. The same discipline applies to
 * `InvalidRefreshTokenException`: "not found", "expired", and
 * "revoked/reused" all surface identically to the client. Distinguishing
 * them is exactly the information an attacker probing the endpoint wants;
 * the distinction still exists internally for logging (Section 28), just
 * never in the HTTP response.
 */

export class InvalidCredentialsException extends DomainException {
  public readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Email or password is incorrect.', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailAlreadyRegisteredException extends DomainException {
  public readonly code = 'EMAIL_ALREADY_REGISTERED';

  constructor() {
    // Registration is a deliberate, narrow exception to the "never confirm
    // whether an email exists" rule above: the person is actively trying
    // to create an account with an email they typed themselves, so
    // confirming a collision here is the expected UX (e.g. "sign in
    // instead?") rather than an enumeration leak — Spec §5.3 lists this as
    // a distinct `409` outcome for `POST /auth/register`.
    super('An account with this email already exists.', HttpStatus.CONFLICT);
  }
}

export class InvalidRefreshTokenException extends DomainException {
  public readonly code = 'INVALID_REFRESH_TOKEN';

  constructor() {
    super('Your session has expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
  }
}

export class AccountBannedException extends DomainException {
  public readonly code = 'ACCOUNT_BANNED';

  constructor() {
    super('This account has been suspended.', HttpStatus.FORBIDDEN);
  }
}
