import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const disputeSchema=z.object({reason:z.string().trim().min(5).max(2000)}).strict(); export class DisputeDto extends createZodDto(disputeSchema){}
