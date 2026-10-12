import { PrismaWalletRepository } from './wallet.repository';
import { DuplicateLedgerOperationException } from './wallet.exceptions';

describe('PrismaWalletRepository idempotency', () => {
  const prisma = {} as any;
  const transactionHelper = {} as any;
  const repository = new PrismaWalletRepository(prisma, transactionHelper);

  function client(existing: any) {
    return {
      skillPointsLedger: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
  }

  it('returns the existing row for an exact idempotent retry', async () => {
    const existing = { id: 'ledger-1', userId: 'user-1', entryType: 'CREDIT', amount: 10, transactionId: null };
    const tx = client(existing);
    await expect(repository.mutateInTransaction(tx as any, 'user-1', 'CREDIT' as any, 10, 'retry', undefined, 'key-1')).resolves.toBe(existing);
    expect(tx.skillPointsLedger.create).not.toHaveBeenCalled();
  });

  it('rejects reuse of an idempotency key for another user or operation', async () => {
    const existing = { id: 'ledger-1', userId: 'user-1', entryType: 'CREDIT', amount: 10, transactionId: null };
    const tx = client(existing);
    await expect(repository.mutateInTransaction(tx as any, 'user-2', 'CREDIT' as any, 10, 'replay', undefined, 'key-1'))
      .rejects.toBeInstanceOf(DuplicateLedgerOperationException);
    expect(tx.skillPointsLedger.create).not.toHaveBeenCalled();
  });

  it('prevents a debit that would make the available balance negative', async () => {
    const tx = client(null);
    tx.skillPointsLedger.findFirst.mockResolvedValue({ balanceAfter: 5 });

    await expect(repository.mutateInTransaction(tx as any, 'user-1', 'DEBIT' as any, 6, 'overspend'))
      .rejects.toThrow('INSUFFICIENT_BALANCE');
    expect(tx.skillPointsLedger.create).not.toHaveBeenCalled();
  });

  it('rejects replaying a transaction ledger entry with a different amount', async () => {
    const existing = { id: 'ledger-1', userId: 'user-1', entryType: 'ESCROW_HOLD', amount: 10, transactionId: 'tx-1' };
    const tx = client(null);
    tx.skillPointsLedger.findFirst.mockResolvedValue(existing);
    await expect(repository.mutateInTransaction(tx as any, 'user-1', 'ESCROW_HOLD' as any, 20, 'changed', 'tx-1'))
      .rejects.toBeInstanceOf(DuplicateLedgerOperationException);
    expect(tx.skillPointsLedger.create).not.toHaveBeenCalled();
  });
});
