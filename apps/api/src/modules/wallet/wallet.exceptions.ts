import { HttpStatus } from '@nestjs/common'; import { DomainException, ResourceConflictException } from '@app/common/exceptions/domain.exception';
export class InsufficientBalanceException extends DomainException { readonly code='INSUFFICIENT_BALANCE'; constructor(){super('Insufficient SkillPoints balance.',HttpStatus.CONFLICT);} }
export class LedgerInvariantException extends DomainException { readonly code='LEDGER_INVARIANT_VIOLATION'; constructor(){super('The wallet ledger invariant was violated.',HttpStatus.INTERNAL_SERVER_ERROR);} }
export class DuplicateLedgerOperationException extends ResourceConflictException { readonly code='DUPLICATE_LEDGER_OPERATION'; constructor(){super('The financial operation has already been applied.');} }
