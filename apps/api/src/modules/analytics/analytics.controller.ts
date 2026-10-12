import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { AnalyticsService } from './analytics.service';
const eventSchema = z.object({ event: z.string().min(1).max(128), properties: z.record(z.unknown()).default({}) }).strict();
class CaptureEventDto extends createZodDto(eventSchema) {}
const roles = [Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN];
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Roles(...roles) @Get('feature-flags/:key') flag(@Param('key') key: string, @CurrentUser('id') userId: string) { return this.service.flag(key, userId); }
  @Roles(...roles) @Post('events') capture(@CurrentUser('id') userId: string, @Body() body: CaptureEventDto) { return this.service.capture(userId, body.event, body.properties); }
}
