import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() get(@CurrentUser('id') userId: string) { return this.service.get(userId); }
  @Patch() update(@CurrentUser('id') userId: string, @Body() body: UpdateSettingsDto) { return this.service.update(userId, body); }
}
