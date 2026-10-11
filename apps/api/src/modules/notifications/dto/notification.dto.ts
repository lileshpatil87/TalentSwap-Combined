import { z } from 'zod'; import { createZodDto } from '@app/common/utils/zod-dto.util';
export const notificationSchema=z.object({userId:z.string().uuid(),type:z.enum(['TRANSACTION','CHAT_MESSAGE','BADGE_AWARDED','DOCUMENT_UPDATE','SYSTEM','MATCH','COMMUNITY','CALL']),payload:z.record(z.unknown())}).strict(); export class CreateNotificationDto extends createZodDto(notificationSchema){}
