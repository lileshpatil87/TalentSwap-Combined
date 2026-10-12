import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
export const sendMessageSchema = z.object({ content: z.string().trim().min(1).max(10000) }).strict();
export class SendMessageDto extends createZodDto(sendMessageSchema) {}
