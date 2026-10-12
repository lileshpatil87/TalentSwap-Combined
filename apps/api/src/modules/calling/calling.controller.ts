import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { CallingService } from './calling.service';

const createCallSchema = z.object({ transactionId: z.string().uuid() }).strict();
class CreateCallDto extends createZodDto(createCallSchema) {}

@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
@Controller('calls')
export class CallingController {
  constructor(private readonly service: CallingService) {}
  @Post() create(@CurrentUser('id') userId: string, @Body() body: CreateCallDto) { return this.service.create(userId, body.transactionId); }
  @Patch(':id/start') start(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.start(id, userId); }
  @Patch(':id/end') end(@Param('id') id: string, @CurrentUser('id') userId: string) { return this.service.end(id, userId); }
}
