import { TransactionsService } from './transactions.service';
import { InvalidTransactionStateException, TransactionOwnershipException } from './transactions.exceptions';

describe('TransactionsService', () => {
  const repo = {
    findById: jest.fn(), findByIdempotencyKeyTx: jest.fn(), createTx: jest.fn(), updateTx: jest.fn(),
    findByIdForUpdate: jest.fn(), flagged: jest.fn(), stats: jest.fn(), history: jest.fn(),
  };
  const wallet = { withFinancialTransaction: jest.fn() };
  const skills = { get: jest.fn() };
  const users = { assertActive: jest.fn() };
  const events = { emit: jest.fn() };
  const service = new TransactionsService(repo as any, wallet as any, skills as any, users as any, events as any);

  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthorized confirmation', async () => {
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD' });
    await expect(service.confirm('t', 'u3')).rejects.toBeInstanceOf(TransactionOwnershipException);
  });

  it('rejects invalid completed state', async () => {
    repo.findById.mockResolvedValue({ id: 't', status: 'COMPLETED' });
    await expect(service.assertCompleted('t', 'u1')).rejects.toBeInstanceOf(InvalidTransactionStateException);
  });

  it('creates transaction and escrow in one financial unit of work', async () => {
    users.assertActive.mockResolvedValueOnce({ id: 'u1' }).mockResolvedValueOnce({ id: 'u2' });
    skills.get.mockResolvedValue({ id: 's1', userId: 'u2' });
    wallet.withFinancialTransaction.mockImplementation(async (_u: string, work: any) => work({ tx: {}, hold: jest.fn().mockResolvedValue({ id: 'l' }) }));
    repo.findByIdempotencyKeyTx.mockResolvedValue(null);
    repo.createTx.mockResolvedValue({ id: 't', status: 'PENDING' });
    repo.updateTx.mockResolvedValue({ id: 't', status: 'ESCROW_HELD' });
    await expect(service.create('u1', { providerId: 'u2', skillId: 's1', type: 'ONE_WAY', pointsHeld: 10, idempotencyKey: '00000000-0000-0000-0000-000000000001' })).resolves.toEqual({ id: 't', status: 'ESCROW_HELD' });
    expect(repo.createTx).toHaveBeenCalled();
    expect(repo.updateTx).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalled();
  });

  it('settles only after both parties confirm', async () => {
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD', providerConfirmed: false, recipientConfirmed: false, pointsHeld: 10 });
    wallet.withFinancialTransaction.mockImplementation(async (_u: string, work: any) => work({ tx: {}, release: jest.fn().mockResolvedValue({}) }));
    repo.findByIdForUpdate.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD', providerConfirmed: false, recipientConfirmed: false, pointsHeld: 10 });
    repo.updateTx.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'PROVIDER_CONFIRMED', providerConfirmed: true, recipientConfirmed: false });
    await service.confirm('t', 'u2');
    expect(repo.updateTx).toHaveBeenCalled();
  });
});
