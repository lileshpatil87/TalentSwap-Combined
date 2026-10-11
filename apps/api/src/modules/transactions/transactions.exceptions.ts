import { HttpStatus } from '@nestjs/common'; import { DomainException, ForbiddenActionException, ResourceConflictException } from '@app/common/exceptions/domain.exception';
export class TransactionNotFoundException extends DomainException { readonly code='TRANSACTION_NOT_FOUND'; constructor(id:string){super(`Transaction '${id}' was not found.`,HttpStatus.NOT_FOUND);} }
export class InvalidTransactionStateException extends DomainException { readonly code='INVALID_TRANSACTION_STATE'; constructor(){super('The transaction cannot perform this transition in its current state.',HttpStatus.CONFLICT);} }
export class TransactionOwnershipException extends ForbiddenActionException { readonly code='TRANSACTION_OWNERSHIP_REQUIRED'; }
export class DuplicateTransactionException extends ResourceConflictException { readonly code='DUPLICATE_TRANSACTION'; constructor(){super('A transaction with this idempotency key already exists.');} }
