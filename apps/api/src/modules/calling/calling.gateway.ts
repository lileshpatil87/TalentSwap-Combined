import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayInit } from '@nestjs/websockets';
import { TokenService } from '@app/modules/auth/token.service';
import type { Socket } from 'socket.io';
import { z } from 'zod';
import { CallingService } from './calling.service';

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const callJoinSchema = z.object({ callId: z.string().uuid() }).strict();
const descriptionSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string().min(1).max(100_000),
}).strict();
const candidateSchema = z.object({
  candidate: z.string().max(4096),
  sdpMid: z.string().max(256).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(256).nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
}).strict();
const signalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('offer'), sdp: descriptionSchema }).strict(),
  z.object({ type: z.literal('answer'), sdp: descriptionSchema }).strict(),
  z.object({ type: z.literal('ice-candidate'), candidate: candidateSchema }).strict(),
  z.object({ type: z.literal('end') }).strict(),
]);
const callSignalSchema = z.object({ callId: z.string().uuid(), payload: signalSchema }).strict();

@WebSocketGateway({ namespace: '/call', cors: { origin: allowedOrigins, credentials: true } })
export class CallingGateway implements OnGatewayInit {
  constructor(private readonly service: CallingService, private readonly tokens: TokenService) {}

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

  @SubscribeMessage('call:join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const parsed = callJoinSchema.safeParse(body);
    if (!parsed.success) return { error: 'INVALID_CALL_PAYLOAD' };

    const user = socket.data.user as { sub: string };
    await this.service.assertParticipant(parsed.data.callId, user.sub);
    const room = `call:${parsed.data.callId}`;
    await socket.join(room);
    socket.to(room).emit('call:peer-joined', { callId: parsed.data.callId, userId: user.sub });
    return { joined: true };
  }

  @SubscribeMessage('call:signal')
  async signal(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown) {
    const parsed = callSignalSchema.safeParse(body);
    if (!parsed.success) return { error: 'INVALID_CALL_SIGNAL' };

    const user = socket.data.user as { sub: string };
    await this.service.assertParticipant(parsed.data.callId, user.sub);
    const room = `call:${parsed.data.callId}`;
    // Participant authorization alone is insufficient: require the sender to have
    // joined the room before allowing them to relay signaling to the other peer.
    if (!socket.rooms.has(room)) return { error: 'CALL_ROOM_NOT_JOINED' };
    socket.to(room).emit('call:signal', {
      callId: parsed.data.callId,
      senderId: user.sub,
      payload: parsed.data.payload,
    });
    return { sent: true };
  }
}
