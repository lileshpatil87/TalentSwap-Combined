import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const updateSkillSchema=z.object({title:z.string().trim().min(2).max(150).optional(),description:z.string().trim().min(10).max(10000).optional(),categoryId:z.number().int().positive().optional(),proficiency:z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']).optional(),type:z.enum(['OFFERING','SEEKING']).optional(),pointRate:z.number().int().min(1).max(1000).optional(),isActive:z.boolean().optional()}).strict();
export class UpdateSkillDto extends createZodDto(updateSkillSchema){}
