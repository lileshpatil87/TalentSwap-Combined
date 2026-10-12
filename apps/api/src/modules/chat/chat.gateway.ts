import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { TokenService } from '@app/modules/auth/token.service';
import type { Socket } from 'socket.io';
import { z } from 'zod';
import { ChatService } from './chat.service';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const joinSchema = z.object({ conversationId: z.string().uuid() }).strict();
const sendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(10_000),
}).strict();

@WebSocketGateway({ namespace: '/chat', cors: { origin: allowedOrigins, credentials: true } })
export class ChatGateway implements OnGatewayInit {
  constructor(private readonly chat: ChatService, private readonly tokens: TokenService) {}

  afterInit(server: any) {
    server.use((socket: any, next: any) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) throw new Error('unauthenticated');
        socket.data.user = this.tokens.verifyAccessToken(token);
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });
  }

  @SubscribeMessage('conversation:join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) return { error: 'INVALID_CONVERSATION_PAYLOAD' };

    const user = socket.data.user as { sub: string };
    await this.chat.getConversation(parsed.data.conversationId, user.sub);
    await socket.join(`conversation:${parsed.data.conversationId}`);
    return { joined: true };
  }

  @SubscribeMessage('message:send')
  async send(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return { error: 'INVALID_MESSAGE_PAYLOAD' };

    const user = socket.data.user as { sub: string };
    const room = `conversation:${parsed.data.conversationId}`;
    // Require an explicit authorized join before using the realtime send path.
    if (!socket.rooms.has(room)) return { error: 'CONVERSATION_ROOM_NOT_JOINED' };
    return this.chat.send(user.sub, parsed.data.conversationId, parsed.data.content);
  }
}
