import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const listSkillsSchema=z.object({q:z.string().trim().max(150).optional(),categoryId:z.coerce.number().int().positive().optional(),proficiency:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']).optional(),type:z.enum(['OFFERING','SEEKING']).optional(),userId:z.string().uuid().optional(),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(100).default(20)}).strict();
export class ListSkillsDto extends createZodDto(listSkillsSchema){}
