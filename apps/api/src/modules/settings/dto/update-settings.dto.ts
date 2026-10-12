import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';

export const updateSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  messageNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  profileVisibility: z.enum(['PUBLIC', 'MEMBERS']),
}).strict();

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
