import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { Role } from '@talentswap/types';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ListSkillsDto } from './dto/list-skills.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  @Public()
  @Get('categories')
  categories() { return this.service.categories(); }

  @Public()
  @Get()
  list(@Query() query: ListSkillsDto) { return this.service.list(query); }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() body: CreateSkillDto) { return this.service.create(userId, body); }

  @Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }, @Body() body: UpdateSkillDto) {
    return this.service.update(id, actor.id, actor.role, body);
  }

  @Roles(Role.USER, Role.VERIFIED_USER, Role.MODERATOR, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: { id: string; role: Role }) {
    return this.service.remove(id, actor.id, actor.role);
  }
}
