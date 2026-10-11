import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) { return this.prisma.transaction.findUnique({ where: { id } }); }
  findByIdempotencyKey(key: string) { return this.prisma.transaction.findUnique({ where: { idempotencyKey: key } }); }
  create(data: any) { return this.prisma.transaction.create({ data }); }
  update(id: string, data: any) { return this.prisma.transaction.update({ where: { id }, data }); }

  findByIdTx(tx: Prisma.TransactionClient, id: string) { return tx.transaction.findUnique({ where: { id } }); }
  async findByIdForUpdate(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRawUnsafe(`SELECT id FROM transactions WHERE id = $1::uuid FOR UPDATE`, id);
    return tx.transaction.findUnique({ where: { id } });
  }
  findByIdempotencyKeyTx(tx: Prisma.TransactionClient, key: string) { return tx.transaction.findUnique({ where: { idempotencyKey: key } }); }
  createTx(tx: Prisma.TransactionClient, data: any) { return tx.transaction.create({ data }); }
  updateTx(tx: Prisma.TransactionClient, id: string, data: any) { return tx.transaction.update({ where: { id }, data }); }

  async stats() {
    const [total, completed, disputed] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      this.prisma.transaction.count({ where: { status: 'DISPUTED' } }),
    ]);
    return { total, completed, disputed };
  }

  flagged() { return this.prisma.transaction.findMany({ where: { status: 'DISPUTED' }, orderBy: { createdAt: 'desc' } }); }

  async history(userId: string, page: number, limit: number) {
    const where = { OR: [{ initiatorId: userId }, { providerId: userId }] };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.transaction.count({ where }),
    ]);
    return { items, total };
  }
}
