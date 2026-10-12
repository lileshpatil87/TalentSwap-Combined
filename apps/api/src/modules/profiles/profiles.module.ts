import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from '@app/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { PROFILES_REPOSITORY } from './profiles.constants';
import { ProfilesController } from './profiles.controller';
import { PrismaProfilesRepository } from './profiles.repository';
import { ProfilesService } from './profiles.service';
@Module({imports:[PrismaModule,UsersModule,SettingsModule],controllers:[ProfilesController],providers:[ProfilesService,{provide:PROFILES_REPOSITORY,useClass:PrismaProfilesRepository}],exports:[ProfilesService]})
export class ProfilesModule{}
