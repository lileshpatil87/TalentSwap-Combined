import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'; import { CurrentUser } from '@app/common/decorators/current-user.decorator'; import { Roles } from '@app/common/decorators/roles.decorator'; import { Role } from '@talentswap/types'; import { CreateTransactionDto } from './dto/create-transaction.dto'; import { DisputeDto } from './dto/dispute.dto'; import { TransactionsService } from './transactions.service';
@Roles(Role.USER,Role.VERIFIED_USER,Role.MODERATOR,Role.ADMIN)
@Controller('transactions') export class TransactionsController { constructor(private readonly service:TransactionsService){}
 @Post() create(@CurrentUser('id')userId:string,@Body()body:CreateTransactionDto){return this.service.create(userId,body);}
 @Get('history') history(@CurrentUser('id')userId:string,@Query('page')page='1',@Query('limit')limit='20'){return this.service.history(userId,Number(page),Number(limit));}
 @Get(':id') get(@Param('id')id:string,@CurrentUser('id')userId:string){return this.service.get(id,userId);}
 @Post(':id/confirm') confirm(@Param('id')id:string,@CurrentUser('id')userId:string){return this.service.confirm(id,userId);}
 @Post(':id/dispute') dispute(@Param('id')id:string,@CurrentUser('id')userId:string,@Body()body:DisputeDto){return this.service.dispute(id,userId,body.reason);}
}
