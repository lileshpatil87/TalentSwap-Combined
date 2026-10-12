import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  createConversation(ids: string[]) { return this.prisma.conversation.create({ data: { participantIds: ids } }); }
  findConversation(id: string) { return this.prisma.conversation.findUnique({ where: { id } }); }

  async list(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { participantIds: { has: userId } },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: { messages: { where: { isDeleted: false }, orderBy: { sentAt: 'desc' }, take: 1 } },
    });
    const otherIds = [...new Set(conversations.flatMap((c) => c.participantIds.filter((id) => id !== userId)))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, email: true, role: true, createdAt: true, profile: { select: { displayName: true, avatarUrl: true, headline: true, location: true, reputationScore: true, totalExchanges: true, isVerified: true } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return conversations.map((c) => {
      const other = c.participantIds.filter((id) => id !== userId).map((id) => byId.get(id)).find(Boolean);
      const profile = other?.profile;
      const last = c.messages[0];
      return {
        id: c.id,
        participant: other ? { id: other.id, name: profile?.displayName ?? other.email.split('@')[0] ?? 'TalentSwap member', role: other.role, avatar: profile?.avatarUrl ?? undefined, headline: profile?.headline ?? undefined, location: profile?.location ?? undefined, rating: Number(profile?.reputationScore ?? 0), reviewCount: profile?.totalExchanges ?? 0, verified: profile?.isVerified ?? false } : { id: '', name: 'Conversation member', role: 'USER', rating: 0, reviewCount: 0, verified: false },
        lastMessage: last?.content ?? '',
        lastMessageAt: (last?.sentAt ?? c.lastMessageAt ?? c.createdAt).toISOString(),
        unreadCount: 0,
      };
    });
  }

  async messages(id: string, page: number, limit: number) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const items = await this.prisma.message.findMany({ where: { conversationId: id, isDeleted: false }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }], skip: (safePage - 1) * safeLimit, take: safeLimit });
    return items.map((m) => ({ id: m.id, conversationId: m.conversationId, senderId: m.senderId, text: m.content, sentAt: m.sentAt.toISOString(), status: 'SENT' as const }));
  }

  send(id: string, userId: string, content: string) {
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({ data: { conversationId: id, senderId: userId, content } });
      await tx.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
      return { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, text: msg.content, sentAt: msg.sentAt.toISOString(), status: 'SENT' as const };
    });
  }
}
