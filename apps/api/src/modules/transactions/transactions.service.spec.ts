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

  it('rejects client-supplied point amounts that do not match the server-side skill rate', async () => {
    users.assertActive.mockResolvedValueOnce({ id: 'u1' }).mockResolvedValueOnce({ id: 'u2' });
    skills.get.mockResolvedValue({ id: 's1', userId: 'u2', type: 'OFFERING', pointRate: 10 });

    await expect(service.create('u1', {
      providerId: 'u2', skillId: 's1', type: 'ONE_WAY', pointsHeld: 1,
      idempotencyKey: '00000000-0000-0000-0000-000000000002',
    })).rejects.toThrow('must match the current server-side rate');
    expect(wallet.withFinancialTransaction).not.toHaveBeenCalled();
    expect(repo.createTx).not.toHaveBeenCalled();
  });

  it('rejects a user who is not a participant from disputing a transaction', async () => {
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD' });

    await expect(service.dispute('t', 'u3', 'The session did not happen'))
      .rejects.toBeInstanceOf(TransactionOwnershipException);
    expect(wallet.withFinancialTransaction).not.toHaveBeenCalled();
  });

  it('creates transaction and escrow in one financial unit of work', async () => {
    users.assertActive.mockResolvedValueOnce({ id: 'u1' }).mockResolvedValueOnce({ id: 'u2' });
    skills.get.mockResolvedValue({ id: 's1', userId: 'u2', type: 'OFFERING', pointRate: 10 });
    wallet.withFinancialTransaction.mockImplementation(async (_u: string, work: any) => work({ tx: {}, hold: jest.fn().mockResolvedValue({ id: 'l' }) }));
    repo.findByIdempotencyKeyTx.mockResolvedValue(null);
    repo.createTx.mockResolvedValue({ id: 't', status: 'PENDING' });
    repo.updateTx.mockResolvedValue({ id: 't', status: 'ESCROW_HELD' });
    await expect(service.create('u1', { providerId: 'u2', skillId: 's1', type: 'ONE_WAY', pointsHeld: 10, idempotencyKey: '00000000-0000-0000-0000-000000000001' })).resolves.toEqual({ id: 't', status: 'ESCROW_HELD' });
    expect(repo.createTx).toHaveBeenCalled();
    expect(repo.updateTx).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalled();
  });


  it('freezes escrow when a dispute is raised instead of automatically refunding points', async () => {
    const release = jest.fn().mockResolvedValue({ id: 'ledger' });
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD', pointsHeld: 10, notes: null });
    repo.findByIdForUpdate.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD', pointsHeld: 10, notes: null });
    wallet.withFinancialTransaction.mockImplementation(async (_users: string[], work: any) => work({ tx: {}, release }));
    repo.updateTx.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'DISPUTED', pointsHeld: 10 });

    const result = await service.dispute('t', 'u1', 'The session did not happen');

    expect(result.status).toBe('DISPUTED');
    expect(release).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ transactionId: 't' }));
  });

  it('requires a meaningful reason before resolving a dispute', async () => {
    await expect(service.resolveDispute('t', 'REFUND_INITIATOR', 'no')).rejects.toThrow();
    expect(wallet.withFinancialTransaction).not.toHaveBeenCalled();
  });

  it('resolves a disputed exchange only once and releases escrow to the selected recipient', async () => {
    const release = jest.fn().mockResolvedValue({ id: 'ledger' });
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'DISPUTED', pointsHeld: 10, notes: 'Dispute: issue' });
    wallet.withFinancialTransaction.mockImplementation(async (_ids: string[], work: any) => work({ tx: {}, release }));
    repo.findByIdForUpdate.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'DISPUTED', pointsHeld: 10, notes: 'Dispute: issue' });
    repo.updateTx.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'CANCELLED' });

    const result = await service.resolveDispute('t', 'REFUND_INITIATOR', 'Evidence reviewed by the administrator');

    expect(release).toHaveBeenCalledWith('u1', 10, 'Dispute resolved: escrow refunded to initiator', 't');
    expect(repo.updateTx).toHaveBeenCalledWith({}, 't', expect.objectContaining({ status: 'CANCELLED' }));
    expect(result.status).toBe('CANCELLED');
  });

  it('moves an overdue confirmation into dispute without releasing escrow', async () => {
    const release = jest.fn().mockResolvedValue({ id: 'ledger' });
    const expired = {
      id: 't', initiatorId: 'u1', providerId: 'u2', status: 'ESCROW_HELD',
      providerConfirmed: false, recipientConfirmed: false, pointsHeld: 10,
      confirmationDeadline: new Date(Date.now() - 60_000), notes: null,
    };
    users.assertActive.mockResolvedValue({ id: 'u1' });
    repo.findById.mockResolvedValue(expired);
    repo.findByIdForUpdate.mockResolvedValue(expired);
    wallet.withFinancialTransaction.mockImplementation(async (_ids: string[], work: any) => work({ tx: {}, release }));
    repo.updateTx.mockResolvedValue({ ...expired, status: 'DISPUTED' });

    const result = await service.confirm('t', 'u1');

    expect(result.status).toBe('DISPUTED');
    expect(release).not.toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ reason: 'Confirmation deadline expired' }));
  });

  it('does not release escrow twice after a dispute is already resolved', async () => {
    const release = jest.fn().mockResolvedValue({ id: 'ledger' });
    repo.findById.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'COMPLETED', pointsHeld: 10 });
    repo.findByIdForUpdate.mockResolvedValue({ id: 't', initiatorId: 'u1', providerId: 'u2', status: 'COMPLETED', pointsHeld: 10 });
    wallet.withFinancialTransaction.mockImplementation(async (_ids: string[], work: any) => work({ tx: {}, release }));

    await expect(service.resolveDispute('t', 'PAY_PROVIDER', 'An administrator reviewed the submitted evidence')).rejects.toBeInstanceOf(InvalidTransactionStateException);
    expect(release).not.toHaveBeenCalled();
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
