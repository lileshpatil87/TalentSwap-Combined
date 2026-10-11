import { HttpStatus } from '@nestjs/common'; import { DomainException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';
export class DocumentNotFoundException extends DomainException{readonly code='DOCUMENT_NOT_FOUND';constructor(){super('Document was not found.',HttpStatus.NOT_FOUND);}}
export class DocumentAccessException extends ForbiddenActionException{readonly code='DOCUMENT_ACCESS_DENIED';}
export class InvalidDocumentException extends DomainException{readonly code='INVALID_DOCUMENT';constructor(){super('The document type or metadata is invalid.',HttpStatus.BAD_REQUEST);}}
