import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database/prisma.module';
import { USERS_REPOSITORY } from './users.constants';
import { UsersController } from './users.controller';
import { PrismaUsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({ imports: [PrismaModule], controllers: [UsersController], providers: [UsersService, { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository }], exports: [UsersService] })
export class UsersModule {}
