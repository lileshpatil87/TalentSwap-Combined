import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import http from 'node:http';
import { Server, Socket } from 'socket.io';
import * as mediasoup from 'mediasoup';
import type { Consumer, Producer, Router, WebRtcTransport, Worker } from 'mediasoup/node/lib/types';

type CallToken = { sub: string; callId: string; exp: number };
type Peer = { userId: string; callId: string; transports: Map<string, WebRtcTransport>; producers: Map<string, Producer>; consumers: Map<string, Consumer> };
const secret = process.env.SFU_SHARED_SECRET ?? '';
if (secret.length < 32) throw new Error('SFU_SHARED_SECRET must contain at least 32 characters');
const allowedOrigins = (process.env.SFU_CORS_ORIGINS ?? 'http://localhost:3000').split(',').map(v => v.trim()).filter(Boolean);
const listenIp = process.env.SFU_LISTEN_IP ?? '0.0.0.0';
const announcedIp = process.env.SFU_ANNOUNCED_IP;
const port = Number(process.env.PORT ?? 4100);
const app = express(); app.use(helmet()); app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'talentswap-sfu' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins, credentials: false }, maxHttpBufferSize: 1e6, transports: ['websocket'] });
const peers = new Map<string, Peer>();
const routers = new Map<string, Router>();
const routerCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
let worker: Worker;

function verifyToken(token: unknown): CallToken {
  if (typeof token !== 'string' || token.length > 4096) throw new Error('INVALID_SFU_TOKEN');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('INVALID_SFU_TOKEN');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, 'base64url'); } catch { throw new Error('INVALID_SFU_TOKEN'); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('INVALID_SFU_SIGNATURE');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as CallToken;
  if (!decoded.sub || !decoded.callId || !Number.isInteger(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) throw new Error('EXPIRED_SFU_TOKEN');
  return decoded;
}

function peerFor(socket: Socket): Peer {
  const peer = peers.get(socket.id);
  if (!peer) throw new Error('CALL_NOT_JOINED');
  return peer;
}
function getRouter(callId: string) {
  let router = routers.get(callId);
  if (!router) throw new Error('ROUTER_NOT_READY');
  return router;
}

io.use((socket, next) => {
  try { socket.data.claims = verifyToken(socket.handshake.auth?.token); next(); }
  catch { next(new Error('unauthorized')); }
});

io.on('connection', socket => {
  const claims = socket.data.claims as CallToken;
  const room = `call:${claims.callId}`;
  const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, claims.exp * 1000 - Date.now()));
  socket.once('disconnect', () => clearTimeout(expiryTimer));
  const run = async (handler: () => Promise<unknown>) => {
    try { return { ok: true, data: await handler() }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'SFU_OPERATION_FAILED' }; }
  };
  socket.on('sfu:join', async (ack?: (value: unknown) => void) => {
    const result = await run(async () => {
      const router = getRouter(claims.callId);
      const cleanupTimer = routerCleanupTimers.get(claims.callId); if (cleanupTimer) clearTimeout(cleanupTimer); routerCleanupTimers.delete(claims.callId);
      peers.set(socket.id, { userId: claims.sub, callId: claims.callId, transports: new Map(), producers: new Map(), consumers: new Map() });
      await socket.join(room);
      const producers = [...peers.entries()].filter(([socketId, peer]) => socketId !== socket.id && peer.callId === claims.callId).flatMap(([, peer]) => [...peer.producers.values()].map(producer => ({ producerId: producer.id, userId: peer.userId, kind: producer.kind })));
      return { routerRtpCapabilities: router.rtpCapabilities, callId: claims.callId, producers };
    }); if (typeof ack === 'function') ack(result);
  });
  socket.on('sfu:create-transport', async (ack?: (value: unknown) => void) => {
    const result = await run(async () => {
      const peer = peerFor(socket); const router = getRouter(peer.callId);
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: listenIp, ...(announcedIp ? { announcedIp } : {}) }],
        enableUdp: true, enableTcp: true, preferUdp: true,
        initialAvailableOutgoingBitrate: 1_000_000,
        appData: { userId: peer.userId, callId: peer.callId },
      });
      peer.transports.set(transport.id, transport);
      transport.on('dtlsstatechange', state => { if (state === 'closed') transport.close(); });
      transport.on('close', () => peer.transports.delete(transport.id));
      return { id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters, sctpParameters: transport.sctpParameters };
    }); if (typeof ack === 'function') ack(result);
  });
  socket.on('sfu:connect-transport', async (input: { transportId: string; dtlsParameters: any }, ack?: (value: unknown) => void) => {
    const result = await run(async () => { const transport = peerFor(socket).transports.get(input?.transportId); if (!transport) throw new Error('TRANSPORT_NOT_FOUND'); await transport.connect({ dtlsParameters: input.dtlsParameters }); return { connected: true }; });
    if (typeof ack === 'function') ack(result);
  });
  socket.on('sfu:produce', async (input: { transportId: string; kind: 'audio' | 'video'; rtpParameters: any }, ack?: (value: unknown) => void) => {
    const result = await run(async () => {
      const peer = peerFor(socket); const transport = peer.transports.get(input?.transportId); if (!transport) throw new Error('TRANSPORT_NOT_FOUND');
      if (!['audio', 'video'].includes(input.kind)) throw new Error('INVALID_MEDIA_KIND');
      const producer = await transport.produce({ kind: input.kind, rtpParameters: input.rtpParameters, appData: { userId: peer.userId } });
      peer.producers.set(producer.id, producer);
      socket.to(room).emit('sfu:new-producer', { producerId: producer.id, userId: peer.userId, kind: producer.kind });
      producer.on('transportclose', () => peer.producers.delete(producer.id));
      return { id: producer.id };
    }); if (typeof ack === 'function') ack(result);
  });
  socket.on('sfu:consume', async (input: { producerId: string; transportId: string; rtpCapabilities: any }, ack?: (value: unknown) => void) => {
    const result = await run(async () => {
      const peer = peerFor(socket); const router = getRouter(peer.callId); const transport = peer.transports.get(input?.transportId);
      if (!transport) throw new Error('TRANSPORT_NOT_FOUND');
      if (!router.canConsume({ producerId: input.producerId, rtpCapabilities: input.rtpCapabilities })) throw new Error('CANNOT_CONSUME_PRODUCER');
      const consumer = await transport.consume({ producerId: input.producerId, rtpCapabilities: input.rtpCapabilities, paused: true });
      peer.consumers.set(consumer.id, consumer);
      consumer.on('transportclose', () => peer.consumers.delete(consumer.id));
      consumer.on('producerclose', () => { peer.consumers.delete(consumer.id); socket.emit('sfu:producer-closed', { consumerId: consumer.id }); });
      return { id: consumer.id, producerId: input.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters, type: consumer.type, producerPaused: consumer.producerPaused };
    }); if (typeof ack === 'function') ack(result);
  });
  socket.on('sfu:resume-consumer', async (input: { consumerId: string }, ack?: (value: unknown) => void) => {
    const result = await run(async () => { const consumer = peerFor(socket).consumers.get(input?.consumerId); if (!consumer) throw new Error('CONSUMER_NOT_FOUND'); await consumer.resume(); return { resumed: true }; });
    if (typeof ack === 'function') ack(result);
  });
  socket.on('disconnect', () => {
    const peer = peers.get(socket.id); if (!peer) return;
    for (const consumer of peer.consumers.values()) consumer.close();
    for (const producer of peer.producers.values()) producer.close();
    for (const transport of peer.transports.values()) transport.close();
    peers.delete(socket.id);
    socket.to(room).emit('sfu:peer-left', { userId: claims.sub });
    if (![...peers.values()].some(other => other.callId === claims.callId)) {
      const timer = setTimeout(() => { const router = routers.get(claims.callId); router?.close(); routers.delete(claims.callId); routerCleanupTimers.delete(claims.callId); }, 60_000);
      routerCleanupTimers.set(claims.callId, timer);
    }
  });
});

async function bootstrap() {
  worker = await mediasoup.createWorker({ rtcMinPort: Number(process.env.SFU_MIN_PORT ?? 40000), rtcMaxPort: Number(process.env.SFU_MAX_PORT ?? 49999), logLevel: 'warn' });
  worker.on('died', () => { console.error('mediasoup worker died; exiting for process supervisor restart'); process.exit(1); });
  const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters: { 'packetization-mode': 1, 'profile-level-id': '42e01f', 'level-asymmetry-allowed': 1 } },
  ];
  // Routers are created lazily from signed call claims on first join.
  io.on('connection', socket => {
    const claims = socket.data.claims as CallToken;
    socket.on('sfu:ensure-router', async (ack?: (value: unknown) => void) => {
      try { if (!routers.has(claims.callId)) routers.set(claims.callId, await worker.createRouter({ mediaCodecs })); const cleanupTimer = routerCleanupTimers.get(claims.callId); if (cleanupTimer) clearTimeout(cleanupTimer); routerCleanupTimers.delete(claims.callId); if (typeof ack === 'function') ack({ ok: true }); }
      catch { if (typeof ack === 'function') ack({ ok: false, error: 'ROUTER_CREATE_FAILED' }); }
    });
  });
  server.listen(port, '0.0.0.0', () => console.log(`TalentSwap mediasoup SFU listening on ${port}`));
}
void bootstrap().catch(error => { console.error(error); process.exit(1); });
