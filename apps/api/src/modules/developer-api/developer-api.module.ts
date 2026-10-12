import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database/prisma.module';
import { DeveloperApiController, PublicDeveloperApiController } from './developer-api.controller';
import { DeveloperApiService } from './developer-api.service';
import { DeveloperApiKeyGuard } from './developer-api-key.guard';

@Module({ imports: [PrismaModule], controllers: [DeveloperApiController, PublicDeveloperApiController], providers: [DeveloperApiService, DeveloperApiKeyGuard] })
export class DeveloperApiModule {}
