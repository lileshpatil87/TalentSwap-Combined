import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get(':id')
  get(@Param('id') id: string) { return this.service.getById(id); }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }, @Body() body: UpdateUserDto) {
    return this.service.update(id, actor.id, actor.role, body);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }) {
    return this.service.deactivate(id, actor.id, actor.role);
  }
}
