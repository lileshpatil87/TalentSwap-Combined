import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
export const forgotPasswordSchema = z.object({ email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()) }).strict();
export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
