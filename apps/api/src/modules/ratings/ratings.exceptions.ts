import { HttpStatus } from '@nestjs/common'; import { DomainException, ForbiddenActionException, ResourceConflictException } from '@app/common/exceptions/domain.exception';
export class RatingNotFoundException extends DomainException{readonly code='RATING_NOT_FOUND';constructor(){super('Rating was not found.',HttpStatus.NOT_FOUND);}}
export class RatingEligibilityException extends DomainException{readonly code='RATING_NOT_ELIGIBLE';constructor(){super('Only eligible completed transactions may be rated.',HttpStatus.CONFLICT);}}
export class RatingOwnershipException extends ForbiddenActionException{readonly code='RATING_OWNERSHIP_REQUIRED';}
export class DuplicateRatingException extends ResourceConflictException{readonly code='DUPLICATE_RATING';constructor(){super('You have already rated this transaction.');}}
