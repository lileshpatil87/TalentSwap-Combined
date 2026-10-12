import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database/prisma.module';
import { SettingsController } from './settings.controller';
import { SettingsRepository } from './settings.repository';
import { SettingsService } from './settings.service';

@Module({ imports: [PrismaModule], controllers: [SettingsController], providers: [SettingsRepository, SettingsService], exports: [SettingsService] })
export class SettingsModule {}
