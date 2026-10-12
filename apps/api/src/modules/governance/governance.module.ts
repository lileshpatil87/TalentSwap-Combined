import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/database/prisma.module';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
@Module({ imports: [PrismaModule], controllers: [GovernanceController], providers: [GovernanceService] })
export class GovernanceModule {}
