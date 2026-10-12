import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { WalletService } from './wallet.service';

@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('balance')
  balance(@CurrentUser('id') userId: string) { return this.service.getBalance(userId); }

  @Get('ledger')
  ledger(@CurrentUser('id') userId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.service.ledger(userId, Number(page), Number(limit));
  }
}
