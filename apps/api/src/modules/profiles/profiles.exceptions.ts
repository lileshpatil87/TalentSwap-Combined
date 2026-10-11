import { HttpStatus } from '@nestjs/common';
import { DomainException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';
export class ProfileNotFoundException extends DomainException { readonly code='PROFILE_NOT_FOUND'; constructor(id:string){super(`Profile '${id}' was not found.`,HttpStatus.NOT_FOUND);} }
export class ProfileOwnershipException extends ForbiddenActionException { readonly code='PROFILE_OWNERSHIP_REQUIRED'; }
