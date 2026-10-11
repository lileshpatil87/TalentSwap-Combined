import { registerSchema } from '@talentswap/validation';

import { createZodDto } from '@app/common/utils/zod-dto.util';

/**
 * `POST /auth/register` request body. Wraps `registerSchema` from
 * `@talentswap/validation` — the schema is the single source of truth
 * (Backend Constitution §16); this class exists only so
 * `ZodValidationPipe` and Swagger have a named type to bind to.
 */
export class RegisterDto extends createZodDto(registerSchema) {}
