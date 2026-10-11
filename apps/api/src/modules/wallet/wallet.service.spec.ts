import { WalletService } from './wallet.service';
import { InsufficientBalanceException } from './wallet.exceptions';

describe('WalletService', () => {
  const repo = {
    latestBalance: jest.fn(), list: jest.fn(), mutate: jest.fn(), mutateInTransaction: jest.fn(),
  };
  const txHelper = { withAdvisoryLock: jest.fn() };
  const service = new WalletService(repo as any, txHelper as any);

  beforeEach(() => jest.clearAllMocks());

  it('credits through the sole ledger repository path', async () => {
    repo.mutate.mockResolvedValue({ id: 'l' });
    await expect(service.credit('u', 10, 'x')).resolves.toEqual({ id: 'l' });
    expect(repo.mutate).toHaveBeenCalledWith('u', 'CREDIT', 10, 'x', undefined, undefined);
  });

  it('rejects non-positive amounts', async () => {
    await expect(service.debit('u', 0, 'x')).rejects.toThrow();
  });

  it('maps insufficient balance', async () => {
    repo.mutate.mockRejectedValue(new Error('INSUFFICIENT_BALANCE'));
    await expect(service.debit('u', 10, 'x')).rejects.toBeInstanceOf(InsufficientBalanceException);
  });

  it('executes atomic work at SERIALIZABLE/advisory-lock boundary', async () => {
    txHelper.withAdvisoryLock.mockImplementation(async (_key: string, work: any) => work({ tx: 'tx' }));
    repo.mutateInTransaction.mockResolvedValue({ id: 'ledger' });
    await service.withFinancialTransaction('u', ctx => ctx.hold('u', 10, 'escrow', 'tx1'));
    expect(txHelper.withAdvisoryLock).toHaveBeenCalledWith('u', expect.any(Function), { isolationLevel: 'Serializable' });
    expect(repo.mutateInTransaction).toHaveBeenCalledWith({ tx: 'tx' }, 'u', 'ESCROW_HOLD', 10, 'escrow', 'tx1');
  });
});
