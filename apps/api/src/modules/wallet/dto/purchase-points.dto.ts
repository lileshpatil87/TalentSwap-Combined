import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const purchasePointsSchema=z.object({points:z.number().int().positive().max(100000),idempotencyKey:z.string().uuid()}).strict();
export class PurchasePointsDto extends createZodDto(purchasePointsSchema){}
