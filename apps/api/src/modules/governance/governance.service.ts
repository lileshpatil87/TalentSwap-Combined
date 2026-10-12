import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

const MIN_GOVERNANCE_XP = 300;
@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  list() { return this.prisma.governanceProposal.findMany({ where: { status: 'OPEN', endsAt: { gt: new Date() } }, include: { author: { select: { id: true, profile: { select: { displayName: true } } } }, _count: { select: { votes: true } } }, orderBy: { endsAt: 'asc' }, take: 100 }); }

  async create(authorId: string, title: string, description: string, durationDays: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: authorId }, select: { experiencePoints: true } });
    if (!profile || profile.experiencePoints < MIN_GOVERNANCE_XP) throw new ForbiddenException(`At least ${MIN_GOVERNANCE_XP} XP is required to create a governance proposal.`);
    return this.prisma.governanceProposal.create({ data: { authorId, title, description, endsAt: new Date(Date.now() + durationDays * 86400000) } });
  }

  async vote(voterId: string, proposalId: string, choice: 'YES' | 'NO' | 'ABSTAIN') {
    const profile = await this.prisma.profile.findUnique({ where: { userId: voterId }, select: { experiencePoints: true } });
    if (!profile || profile.experiencePoints < MIN_GOVERNANCE_XP) throw new ForbiddenException(`At least ${MIN_GOVERNANCE_XP} XP is required to vote.`);
    const proposal = await this.prisma.governanceProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Proposal not found.');
    if (proposal.status !== 'OPEN' || proposal.endsAt <= new Date()) {
      if (proposal.status === 'OPEN' && proposal.endsAt <= new Date()) await this.prisma.governanceProposal.update({ where: { id: proposalId }, data: { status: 'CLOSED' } });
      throw new BadRequestException('This proposal is closed.');
    }
    if (proposal.authorId === voterId) throw new BadRequestException('Proposal authors cannot vote on their own proposal.');
    try { await this.prisma.governanceVote.create({ data: { proposalId, voterId, choice } }); }
    catch (error: any) { if (error?.code === 'P2002') throw new BadRequestException('You have already voted on this proposal.'); throw error; }
    return this.tally(proposalId);
  }

  async tally(proposalId: string) {
    const proposal = await this.prisma.governanceProposal.findUnique({ where: { id: proposalId }, select: { id: true, title: true, status: true, endsAt: true } });
    if (!proposal) throw new NotFoundException('Proposal not found.');
    if (proposal.status === 'OPEN' && proposal.endsAt <= new Date()) { await this.prisma.governanceProposal.update({ where: { id: proposalId }, data: { status: 'CLOSED' } }); proposal.status = 'CLOSED'; }
    const grouped = await this.prisma.governanceVote.groupBy({ by: ['choice'], where: { proposalId }, _count: { _all: true } });
    const counts = { YES: 0, NO: 0, ABSTAIN: 0 };
    for (const row of grouped) counts[row.choice as keyof typeof counts] = row._count._all;
    return { proposal, votes: counts, total: counts.YES + counts.NO + counts.ABSTAIN };
  }
}
