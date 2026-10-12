import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
export const resetPasswordSchema = z.object({ token: z.string().min(32).max(256), password: z.string().min(8).max(128).regex(/[a-z]/, 'Password must contain a lowercase letter').regex(/[A-Z]/, 'Password must contain an uppercase letter').regex(/[0-9]/, 'Password must contain a number') }).strict();
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
