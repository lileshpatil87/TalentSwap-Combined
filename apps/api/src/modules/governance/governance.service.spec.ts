import { GovernanceService } from './governance.service';

describe('GovernanceService', () => {
  it('requires minimum XP before allowing a vote', async () => {
    const prisma = { profile: { findUnique: jest.fn(async () => ({ experiencePoints: 10 })) } };
    const service = new GovernanceService(prisma as any);
    await expect(service.vote('user-id', 'proposal-id', 'YES')).rejects.toThrow('At least 300 XP is required to vote.');
  });

  it('rejects duplicate votes and returns a tally after a valid vote', async () => {
    const prisma = {
      profile: { findUnique: jest.fn(async () => ({ experiencePoints: 400 })) },
      governanceProposal: { findUnique: jest.fn(async () => ({ id: 'p1', authorId: 'other-user', status: 'OPEN', endsAt: new Date(Date.now() + 60000) })) },
      governanceVote: {
        create: jest.fn(async () => ({ id: 'v1' })),
        groupBy: jest.fn(async () => [{ choice: 'YES', _count: { _all: 1 } }]),
      },
    };
    const service = new GovernanceService(prisma as any);
    const result = await service.vote('voter', 'p1', 'YES');
    expect(result.total).toBe(1);
    expect(result.votes.YES).toBe(1);
  });
});
