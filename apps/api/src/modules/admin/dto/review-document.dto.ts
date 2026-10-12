import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';

export const reviewDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().max(2000).optional(),
}).strict();
export class ReviewDocumentDto extends createZodDto(reviewDocumentSchema) {}
