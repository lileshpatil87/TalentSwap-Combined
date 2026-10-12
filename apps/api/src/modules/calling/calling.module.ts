import { Module } from '@nestjs/common';
import { CallingRepository } from './calling.repository';
import { AuthModule } from '@app/modules/auth/auth.module';
import { PrismaModule } from '@app/database/prisma.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CallingController } from './calling.controller';
import { CallingGateway } from './calling.gateway';
import { CallingService } from './calling.service';

@Module({ imports: [PrismaModule, UsersModule, TransactionsModule, AuthModule], controllers: [CallingController], providers: [CallingService, CallingGateway, CallingRepository], exports: [CallingService] })
export class CallingModule {}
