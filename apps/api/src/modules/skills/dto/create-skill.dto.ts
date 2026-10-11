import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const skillProficiency=z.enum(['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT']);
export const skillType=z.enum(['OFFERING','SEEKING']);
export const createSkillSchema=z.object({title:z.string().trim().min(2).max(150),description:z.string().trim().min(10).max(10000),categoryId:z.number().int().positive(),proficiency:skillProficiency,type:skillType,pointRate:z.number().int().min(1).max(1000).default(10)}).strict();
export class CreateSkillDto extends createZodDto(createSkillSchema){}
