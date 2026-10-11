import { loginSchema } from '@talentswap/validation';

import { createZodDto } from '@app/common/utils/zod-dto.util';

/**
 * `POST /auth/login` request body. Wraps `loginSchema` from
 * `@talentswap/validation` — see `register.dto.ts` for the rationale.
 */
export class LoginDto extends createZodDto(loginSchema) {}
