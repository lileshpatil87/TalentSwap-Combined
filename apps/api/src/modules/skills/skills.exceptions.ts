import { HttpStatus } from '@nestjs/common';
import { DomainException, ForbiddenActionException } from '@app/common/exceptions/domain.exception';
export class SkillNotFoundException extends DomainException { readonly code='SKILL_NOT_FOUND'; constructor(id:string){super(`Skill '${id}' was not found.`,HttpStatus.NOT_FOUND);} }
export class SkillOwnershipException extends ForbiddenActionException { readonly code='SKILL_OWNERSHIP_REQUIRED'; }
export class SkillCategoryNotFoundException extends DomainException { readonly code='SKILL_CATEGORY_NOT_FOUND'; constructor(id:string){super(`Skill category '${id}' was not found.`,HttpStatus.NOT_FOUND);} }
