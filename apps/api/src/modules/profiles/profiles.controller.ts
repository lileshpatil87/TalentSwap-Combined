import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Public } from '@app/common/decorators/public.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '@app/common/guards/optional-jwt-auth.guard';
import { Role } from '@talentswap/types';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  @Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
  @Get('me')
  me(@CurrentUser('id') userId: string) { return this.service.getOrCreate(userId); }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':userId')
  get(@Param('userId') userId: string, @CurrentUser('id') viewerId?: string) { return this.service.getByUserId(userId, true, viewerId); }

  @Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
  @Patch('me')
  updateMe(@CurrentUser() actor: { id: string; role: Role }, @Body() body: UpdateProfileDto) {
    return this.service.update(actor.id, actor.id, actor.role, body as any);
  }

  @Roles(Role.ADMIN)
  @Patch(':userId')
  update(@Param('userId') userId: string, @CurrentUser() actor: { id: string; role: Role }, @Body() body: UpdateProfileDto) {
    return this.service.update(userId, actor.id, actor.role, body as any);
  }
}
