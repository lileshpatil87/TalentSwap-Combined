import { CallingGateway } from './calling.gateway';

describe('CallingGateway payload and room authorization', () => {
  const service = { assertParticipant: jest.fn() };
  const tokens = { verifyAccessToken: jest.fn() };
  const gateway = new CallingGateway(service as any, tokens as any);
  const callId = '22222222-2222-4222-8222-222222222222';
  const userId = 'user-1';
  const room = `call:${callId}`;
  const peer = { emit: jest.fn() };
  const socket: any = {
    data: { user: { sub: userId } },
    rooms: new Set<string>(['socket-1']),
    join: jest.fn(async (name: string) => socket.rooms.add(name)),
    to: jest.fn(() => peer),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socket.rooms = new Set<string>(['socket-1']);
    service.assertParticipant.mockResolvedValue({ id: callId, participantIds: [userId] });
  });

  it('rejects malformed call joins', async () => {
    await expect(gateway.join(socket, { callId: 'invalid' })).resolves.toEqual({ error: 'INVALID_CALL_PAYLOAD' });
    expect(service.assertParticipant).not.toHaveBeenCalled();
  });

  it('authorizes and joins a call room', async () => {
    await expect(gateway.join(socket, { callId })).resolves.toEqual({ joined: true });
    expect(service.assertParticipant).toHaveBeenCalledWith(callId, userId);
    expect(socket.rooms.has(room)).toBe(true);
    expect(peer.emit).toHaveBeenCalledWith('call:peer-joined', { callId, userId });
  });

  it('does not relay signals from a participant who has not joined the room', async () => {
    await expect(gateway.signal(socket, { callId, payload: { type: 'end' } })).resolves.toEqual({ error: 'CALL_ROOM_NOT_JOINED' });
    expect(peer.emit).not.toHaveBeenCalled();
  });

  it('rejects invalid signaling payloads and relays valid signals only from joined participants', async () => {
    await expect(gateway.signal(socket, { callId, payload: { type: 'offer', sdp: '<script>' } })).resolves.toEqual({ error: 'INVALID_CALL_SIGNAL' });
    socket.rooms.add(room);
    const payload = { type: 'end' };
    await expect(gateway.signal(socket, { callId, payload })).resolves.toEqual({ sent: true });
    expect(peer.emit).toHaveBeenCalledWith('call:signal', { callId, senderId: userId, payload });
  });
});
