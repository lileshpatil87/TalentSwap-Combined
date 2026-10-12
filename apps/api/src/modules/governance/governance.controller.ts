import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from '@app/common/utils/zod-dto.util';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { GovernanceService } from './governance.service';
const proposalSchema = z.object({ title: z.string().trim().min(8).max(160), description: z.string().trim().min(30).max(5000), durationDays: z.number().int().min(1).max(30).default(7) }).strict();
class CreateProposalDto extends createZodDto(proposalSchema) {}
const voteSchema = z.object({ choice: z.enum(['YES', 'NO', 'ABSTAIN']) }).strict();
class VoteDto extends createZodDto(voteSchema) {}
const roles = [Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN];
@Controller('governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}
  @Roles(...roles) @Get('proposals') list() { return this.service.list(); }
  @Roles(...roles) @Post('proposals') create(@CurrentUser('id') userId: string, @Body() body: CreateProposalDto) { return this.service.create(userId, body.title, body.description, body.durationDays); }
  @Roles(...roles) @Post('proposals/:id/vote') vote(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: VoteDto) { return this.service.vote(userId, id, body.choice); }
  @Roles(...roles) @Get('proposals/:id/tally') tally(@Param('id') id: string) { return this.service.tally(id); }
}
