import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const createTransactionSchema=z.object({providerId:z.string().uuid(),skillId:z.string().uuid(),type:z.enum(['ONE_WAY','TWO_WAY']),pointsHeld:z.number().int().positive().max(100000),idempotencyKey:z.string().uuid(),confirmationDeadline:z.coerce.date().optional(),notes:z.string().max(5000).optional()}).strict();
export class CreateTransactionDto extends createZodDto(createTransactionSchema){}
