import { ChatGateway } from './chat.gateway';

describe('ChatGateway payload and room authorization', () => {
  const chat = {
    getConversation: jest.fn(),
    send: jest.fn(),
  };
  const tokens = { verifyAccessToken: jest.fn() };
  const gateway = new ChatGateway(chat as any, tokens as any);
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const userId = 'user-1';
  const socket: any = {
    data: { user: { sub: userId } },
    rooms: new Set<string>(['socket-1']),
    join: jest.fn(async (room: string) => socket.rooms.add(room)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socket.rooms = new Set<string>(['socket-1']);
  });

  it('rejects malformed join payloads without querying conversations', async () => {
    await expect(gateway.join(socket, { conversationId: 'not-a-uuid' })).resolves.toEqual({ error: 'INVALID_CONVERSATION_PAYLOAD' });
    expect(chat.getConversation).not.toHaveBeenCalled();
  });

  it('authorizes and joins the conversation room', async () => {
    chat.getConversation.mockResolvedValue({ id: conversationId, participantIds: [userId] });
    await expect(gateway.join(socket, { conversationId })).resolves.toEqual({ joined: true });
    expect(chat.getConversation).toHaveBeenCalledWith(conversationId, userId);
    expect(socket.rooms.has(`conversation:${conversationId}`)).toBe(true);
  });

  it('rejects malformed and unjoined realtime messages', async () => {
    await expect(gateway.send(socket, { conversationId, content: '   ' })).resolves.toEqual({ error: 'INVALID_MESSAGE_PAYLOAD' });
    await expect(gateway.send(socket, { conversationId, content: 'hello' })).resolves.toEqual({ error: 'CONVERSATION_ROOM_NOT_JOINED' });
    expect(chat.send).not.toHaveBeenCalled();
  });

  it('sends a validated message only after joining its room', async () => {
    socket.rooms.add(`conversation:${conversationId}`);
    chat.send.mockResolvedValue({ id: 'message-1', content: 'hello' });
    await expect(gateway.send(socket, { conversationId, content: ' hello ' })).resolves.toEqual({ id: 'message-1', content: 'hello' });
    expect(chat.send).toHaveBeenCalledWith(userId, conversationId, 'hello');
  });
});
