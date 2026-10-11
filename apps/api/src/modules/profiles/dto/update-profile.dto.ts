import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
export const updateProfileSchema = z.object({ displayName:z.string().trim().min(1).max(100).optional(), bio:z.string().max(5000).optional(), avatarUrl:z.string().max(500).optional(), location:z.string().trim().max(150).optional() }).strict();
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
