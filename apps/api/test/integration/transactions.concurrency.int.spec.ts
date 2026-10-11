import { PrismaClient } from '@prisma/client';
import { TransactionHelper } from '../../src/database/transaction.helper';
import { PrismaWalletRepository } from '../../src/modules/wallet/wallet.repository';
import { WalletService } from '../../src/modules/wallet/wallet.service';
import { PrismaTransactionsRepository } from '../../src/modules/transactions/transactions.repository';
import { TransactionsService } from '../../src/modules/transactions/transactions.service';

const enabled = Boolean(process.env.DATABASE_URL && process.env.RUN_FINANCIAL_CONCURRENCY_TESTS === 'true');

describe('Transaction escrow concurrency integration', () => {
  const run = enabled ? it : it.skip;
  const prisma = new PrismaClient();

  afterAll(async () => prisma.$disconnect());

  run('allows only affordable concurrent escrow requests', async () => {
    const suffix = Date.now();
    const initiator = await prisma.user.create({ data: { email: `tx-init-${suffix}@example.com`, passwordHash: 'test' } });
    const provider = await prisma.user.create({ data: { email: `tx-provider-${suffix}@example.com`, passwordHash: 'test' } });
    await prisma.profile.create({ data: { userId: initiator.id, displayName: 'Initiator' } });
    await prisma.profile.create({ data: { userId: provider.id, displayName: 'Provider' } });
    const category = await prisma.skillCategory.create({ data: { name: `Integration ${suffix}`, slug: `integration-${suffix}` } });
    const skill = await prisma.skill.create({ data: { userId: provider.id, categoryId: category.id, title: 'Integration Skill', description: 'Concurrency test skill', proficiency: 'ADVANCED', type: 'OFFERING', pointRate: 10 } });

    const helper = new TransactionHelper(prisma as any);
    const wallet = new WalletService(new PrismaWalletRepository(prisma as any, helper), helper);
    await wallet.credit(initiator.id, 100, 'integration seed');
    const repo = new PrismaTransactionsRepository(prisma as any);
    const users = { assertActive: jest.fn().mockImplementation((id: string) => prisma.user.findUniqueOrThrow({ where: { id } })) };
    const skills = { get: jest.fn().mockResolvedValue(skill) };
    const events = { emit: jest.fn() };
    const service = new TransactionsService(repo, wallet, skills as any, users as any, events as any);

    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => service.create(initiator.id, {
      providerId: provider.id,
      skillId: skill.id,
      type: 'ONE_WAY',
      pointsHeld: 10,
      idempotencyKey: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    })));
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(10);
    expect(await wallet.getBalance(initiator.id)).toEqual({ balance: 0 });

    await prisma.skillPointsLedger.deleteMany({ where: { userId: { in: [initiator.id, provider.id] } } });
    await prisma.transaction.deleteMany({ where: { initiatorId: initiator.id } });
    await prisma.skill.delete({ where: { id: skill.id } });
    await prisma.skillCategory.delete({ where: { id: category.id } });
    await prisma.profile.deleteMany({ where: { userId: { in: [initiator.id, provider.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [initiator.id, provider.id] } } });
  }, 60_000);
});
