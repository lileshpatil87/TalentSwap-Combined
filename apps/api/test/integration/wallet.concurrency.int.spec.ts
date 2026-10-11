import { PrismaClient } from '@prisma/client';
import { PrismaWalletRepository } from '../../src/modules/wallet/wallet.repository';
import { TransactionHelper } from '../../src/database/transaction.helper';

const enabled = Boolean(process.env.DATABASE_URL && process.env.RUN_FINANCIAL_CONCURRENCY_TESTS === 'true');

describe('Wallet ledger concurrency integration', () => {
  const run = enabled ? it : it.skip;
  const prisma = new PrismaClient();

  afterAll(async () => prisma.$disconnect());

  run('prevents double-spend under concurrent serializable/advisory-lock debits', async () => {
    const user = await prisma.user.create({ data: { email: `ledger-int-${Date.now()}@example.com`, passwordHash: 'test' } });
    const helper = new TransactionHelper(prisma as any);
    const repo = new PrismaWalletRepository(prisma as any, helper);
    await repo.mutate(user.id, 'CREDIT', 100, 'integration seed');

    const results = await Promise.allSettled(Array.from({ length: 20 }, () => repo.mutate(user.id, 'DEBIT', 10, 'concurrent debit')));
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(10);
    expect(await repo.latestBalance(user.id)).toBe(0);
    await prisma.skillPointsLedger.deleteMany({ where: { userId: user.id } });
    await prisma.profile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }, 30_000);
});
