import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { GamificationService } from './gamification.service';

@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
@Controller('gamification')
export class GamificationMeController {
  constructor(private readonly service: GamificationService) {}
  @Get('me') snapshot(@CurrentUser('id') userId: string) { return this.service.snapshot(userId); }
}
