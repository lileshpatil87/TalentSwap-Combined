import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { AdminService } from './admin.service';
import { ResolveDisputeDto } from '../transactions/dto/resolve-dispute.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { ReviewDocumentDto } from './dto/review-document.dto';

@Controller('admin')
@Roles(Role.ADMIN, Role.MODERATOR)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('users') users(@Query('page') page = '1', @Query('limit') limit = '20') { return this.service.usersList(Number(page), Number(limit)); }
  @Roles(Role.ADMIN)
  @Patch('users/:id/ban') ban(@Param('id') id: string, @CurrentUser('id') actorId: string, @Body() body: BanUserDto) { return this.service.ban(actorId, id, body.banned); }
  @Get('documents/queue') documents() { return this.service.documents(); }
  @Patch('documents/:id/review') review(@Param('id') id: string, @CurrentUser('id') actorId: string, @Body() body: ReviewDocumentDto) { return this.service.reviewDocument(actorId, id, body.status, body.reason); }
  @Get('transactions/flagged') flagged() { return this.service.flaggedTransactions(); }
  @Roles(Role.ADMIN)
  @Patch('transactions/:id/resolve-dispute') resolveDispute(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: ResolveDisputeDto) { return this.service.resolveDispute(adminId, id, body.outcome, body.reason); }
  @Get('analytics/dashboard') dashboard() { return this.service.dashboard(); }
}
