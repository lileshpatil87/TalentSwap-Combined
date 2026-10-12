import { Controller, Delete, Get, Param } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }) { return this.service.getForActor(id, actor.id, actor.role); }

  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }) {
    return this.service.deactivate(id, actor.id, actor.role);
  }
}
