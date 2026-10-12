import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

@Injectable()
export class CallingRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: { initiatorId: string; participantIds: string[]; channelName: string; status: 'RINGING'; transactionId: string }) { return this.prisma.callSession.create({ data }); }
  find(id: string) { return this.prisma.callSession.findUnique({ where: { id } }); }
  findActiveByTransactionId(transactionId: string) { return this.prisma.callSession.findFirst({ where: { transactionId, status: { in: ['RINGING', 'ACTIVE'] } }, orderBy: { createdAt: 'desc' } }); }
  update(id: string, data: { status: 'ACTIVE' | 'ENDED'; startedAt?: Date; endedAt?: Date }) { return this.prisma.callSession.update({ where: { id }, data }); }
}
