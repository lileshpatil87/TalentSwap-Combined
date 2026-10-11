import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { PROFILES_REPOSITORY } from './profiles.constants';
import { ProfilesController } from './profiles.controller';
import { PrismaProfilesRepository } from './profiles.repository';
import { ProfilesService } from './profiles.service';
@Module({imports:[PrismaModule,UsersModule],controllers:[ProfilesController],providers:[ProfilesService,{provide:PROFILES_REPOSITORY,useClass:PrismaProfilesRepository}],exports:[ProfilesService]})
export class ProfilesModule{}
