import { HttpStatus } from '@nestjs/common'; import { DomainException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';
export class StorageConfigurationException extends DomainException{readonly code='STORAGE_NOT_CONFIGURED';constructor(){super('Object storage is not configured.',HttpStatus.SERVICE_UNAVAILABLE);}}
export class StorageAccessException extends ForbiddenActionException{readonly code='STORAGE_ACCESS_DENIED';}
