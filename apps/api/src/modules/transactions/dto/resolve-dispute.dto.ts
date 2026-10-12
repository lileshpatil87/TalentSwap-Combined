import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';

export const resolveDisputeSchema = z.object({
  outcome: z.enum(['REFUND_INITIATOR', 'PAY_PROVIDER']),
  reason: z.string().trim().min(10).max(2000),
}).strict();

export class ResolveDisputeDto extends createZodDto(resolveDisputeSchema) {}
