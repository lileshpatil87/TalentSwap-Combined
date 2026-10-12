import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';

export const banUserSchema = z.object({ banned: z.boolean() }).strict();
export class BanUserDto extends createZodDto(banUserSchema) {}
