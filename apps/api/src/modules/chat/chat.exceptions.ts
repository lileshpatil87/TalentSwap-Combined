import { HttpStatus } from '@nestjs/common'; import { DomainException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';
export class ConversationNotFoundException extends DomainException{readonly code='CONVERSATION_NOT_FOUND';constructor(){super('Conversation was not found.',HttpStatus.NOT_FOUND);}}
export class ConversationAccessException extends ForbiddenActionException{readonly code='CONVERSATION_ACCESS_DENIED';constructor(){super('You are not a participant in this conversation.');}}
