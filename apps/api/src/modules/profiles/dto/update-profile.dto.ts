import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  location: z.string().trim().max(120).optional(),
  availability: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(80).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
}).strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
