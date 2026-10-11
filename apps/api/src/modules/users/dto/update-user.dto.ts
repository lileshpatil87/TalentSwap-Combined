import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
import { Role } from '@talentswap/types';

export const updateUserSchema = z.object({
  email: z.string().email().max(255).optional(),
  role: z.nativeEnum(Role).optional(),
  isEmailVerified: z.boolean().optional(),
  isBanned: z.boolean().optional(),
}).strict();
export class UpdateUserDto extends createZodDto(updateUserSchema) {}
