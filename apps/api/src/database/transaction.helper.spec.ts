import { TransactionHelper } from './transaction.helper';

describe('TransactionHelper', () => {
  it('retries PostgreSQL serialization failures', async () => {
    const prisma = { $transaction: jest.fn() };
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('serialization failure'), { code: 'P2034' })).mockResolvedValueOnce('ok');
    const helper = new TransactionHelper(prisma as any);
    await expect(helper.withTransaction(async () => 'work', { isolationLevel: 'Serializable', retries: 1 })).resolves.toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
