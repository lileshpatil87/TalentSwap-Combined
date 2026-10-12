import { Body, Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { DeveloperApiService } from './developer-api.service';
import { DeveloperApiKeyGuard } from './developer-api-key.guard';

const createKeySchema = z.object({ name: z.string().trim().min(2).max(100), expiresInDays: z.number().int().min(1).max(365).default(90) }).strict();
class CreateKeyDto extends createZodDto(createKeySchema) {}
const revokeKeySchema = z.object({ id: z.string().uuid() }).strict();
class RevokeKeyDto extends createZodDto(revokeKeySchema) {}

@Controller('developer/api-keys')
export class DeveloperApiController {
  constructor(private readonly service: DeveloperApiService) {}
  @Get() list(@CurrentUser('id') userId: string) { return this.service.listKeys(userId); }
  @Post() create(@CurrentUser('id') userId: string, @Body() body: CreateKeyDto) { return this.service.createKey(userId, body.name, body.expiresInDays); }
  @Delete() revoke(@CurrentUser('id') userId: string, @Body() body: RevokeKeyDto) { return this.service.revokeKey(userId, body.id); }
}

@Public()
@UseGuards(DeveloperApiKeyGuard)
@Controller('public/v1')
export class PublicDeveloperApiController {
  constructor(private readonly service: DeveloperApiService) {}
  @Get('skills') skills(@Query('q') q = '', @Query('limit') limit = '20') {
    return this.service.listPublicSkills(q.slice(0, 120), Number(limit));
  }
}
