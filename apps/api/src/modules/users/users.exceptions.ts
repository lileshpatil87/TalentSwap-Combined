import { HttpStatus } from '@nestjs/common';
import { DomainException, ForbiddenActionException, ResourceConflictException } from '@app/common/exceptions/domain.exception';

export class UserNotFoundException extends DomainException {
  readonly code = 'USER_NOT_FOUND';
  constructor(id: string) { super(`User '${id}' was not found.`, HttpStatus.NOT_FOUND); }
}
export class UserEmailConflictException extends ResourceConflictException {
  readonly code = 'USER_EMAIL_CONFLICT';
  constructor() { super('The email address is already registered.'); }
}
export class UserOwnershipException extends ForbiddenActionException {
  readonly code = 'USER_OWNERSHIP_REQUIRED';
  constructor() { super('You may only modify your own account unless you are an administrator.'); }
}
export class BannedUserException extends ForbiddenActionException {
  readonly code = 'USER_BANNED';
  constructor() { super('This account is banned.'); }
}
