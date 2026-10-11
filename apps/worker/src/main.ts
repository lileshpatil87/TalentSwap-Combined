import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import net from 'node:net';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, input: text }),
      });
      if (!response.ok) throw new Error(`EMBEDDING_PROVIDER_${response.status}`);
      const json = await response.json() as any;
      const vector = json.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== 1536) throw new Error('INVALID_EMBEDDING_RESPONSE');
      return vector;
    } catch (error) {
      last = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw last instanceof Error ? last : new Error('EMBEDDING_PROVIDER_FAILURE');
}

async function scanWithClamAv(downloadUrl: string): Promise<{ clean: boolean; signature?: string }> {
  const host = process.env.CLAMAV_HOST ?? 'localhost';
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`OBJECT_DOWNLOAD_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunksOut: Buffer[] = [];
    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; fn(); socket.destroy(); } };
    socket.setTimeout(30_000);
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const chunkSize = 64 * 1024;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        const header = Buffer.alloc(4); header.writeUInt32BE(chunk.length, 0);
        socket.write(header); socket.write(chunk);
      }
      const end = Buffer.alloc(4); end.writeUInt32BE(0, 0); socket.write(end);
    });
    socket.on('data', d => chunksOut.push(Buffer.from(d)));
    socket.on('end', () => {
      const result = Buffer.concat(chunksOut).toString('utf8').trim();
      if (result.endsWith('OK')) finish(() => resolve({ clean: true }));
      else if (result.startsWith('stream:')) finish(() => resolve({ clean: false, signature: result }));
      else finish(() => reject(new Error(`CLAMAV_ERROR:${result}`)));
    });
    socket.on('timeout', () => finish(() => reject(new Error('CLAMAV_TIMEOUT'))));
    socket.on('error', err => finish(() => reject(err)));
  });
}

const documentWorker = new Worker('document-scan', async job => {
  if (job.name !== 'scan') return;
  const document = await prisma.document.findUnique({ where: { id: job.data.documentId } });
  if (!document) return;
  try {
    const scan = await scanWithClamAv(job.data.downloadUrl);
    if (!scan.clean) {
      await prisma.document.update({ where: { id: document.id }, data: { status: 'REJECTED', scanResult: { engine: 'ClamAV', clean: false, signature: scan.signature } } });
      return;
    }
    await prisma.document.update({ where: { id: document.id }, data: { status: 'PENDING_REVIEW', scanResult: { engine: 'ClamAV', clean: true } } });
  } catch (error) {
    await prisma.document.update({ where: { id: document.id }, data: { status: 'SCANNING', scanResult: { engine: 'ClamAV', error: error instanceof Error ? error.message : 'SCAN_FAILED' } } });
    throw error;
  }
}, { connection, concurrency: 5 });

const searchWorker = new Worker('search-sync', async job => {
  if (job.name === 'skill-upsert') {
    const skill = await prisma.skill.findUnique({ where: { id: job.data.skillId }, select: { id: true, isActive: true } });
    if (skill?.isActive) await prisma.$executeRawUnsafe(`UPDATE skills SET title = title WHERE id = $1::uuid`, skill.id);
    return { processed: Boolean(skill) };
  }
  if (job.name === 'rebuild') {
    const result = await prisma.$executeRawUnsafe(`UPDATE skills SET title = title WHERE is_active = true`);
    return { rebuilt: Number(result) };
  }
  return { skipped: true };
}, { connection, concurrency: 2 });

const embeddingWorker = new Worker('skill-embeddings', async job => {
  if (job.name !== 'skill-embed') return;
  const skill = await prisma.skill.findUnique({ where: { id: job.data.skillId }, select: { id: true, isActive: true, title: true, description: true } });
  if (!skill || !skill.isActive) return;
  const vector = await embed(job.data.text ?? `${skill.title}\n${skill.description}`);
  const encoded = `[${vector.join(',')}]`;
  await prisma.$executeRawUnsafe(`UPDATE skills SET embedding = $1::vector WHERE id = $2::uuid`, encoded, skill.id);
  return { embedded: skill.id };
}, { connection, concurrency: 2 });

const gamificationWorker = new Worker('gamification', async job => {
  if (job.name !== 'award-xp') return;
  const { userId, xp, reason } = job.data as { userId: string; xp: number; reason: string };
  if (!Number.isInteger(xp) || xp <= 0) throw new Error('INVALID_XP_JOB');
  return prisma.$transaction(async tx => {
    try {
      await tx.workerJobReceipt.create({ data: { jobId: `${job.queueName}:${job.id}`, queueName: job.queueName } });
    } catch (error: any) {
      if (error?.code === 'P2002') return { duplicate: true };
      throw error;
    }
    const profile = await tx.profile.findUnique({ where: { userId }, select: { experiencePoints: true } });
    if (!profile) return { skipped: true };
    const nextXp = profile.experiencePoints + xp;
    const level = nextXp >= 1000 ? 'CHAMPION' : nextXp >= 600 ? 'PLATINUM' : nextXp >= 300 ? 'GOLD' : nextXp >= 100 ? 'SILVER' : 'BRONZE';
    const updated = await tx.profile.update({ where: { userId }, data: { experiencePoints: { increment: xp }, experienceLevel: level } });
    const badges = await tx.badge.findMany({ where: { conditionType: 'XP', conditionValue: { lte: updated.experiencePoints } } });
    for (const badge of badges) await tx.userBadge.upsert({ where: { userId_badgeId: { userId, badgeId: badge.id } }, update: {}, create: { userId, badgeId: badge.id } });
    return { userId, xp, reason, experiencePoints: updated.experiencePoints };
  });
}, { connection, concurrency: 5 });

const notificationWorker = new Worker('notifications', async job => {
  if (job.name !== 'persist') return;
  const { userId, type, payload } = job.data;
  const result = await prisma.$transaction(async tx => {
    try {
      await tx.workerJobReceipt.create({ data: { jobId: `${job.queueName}:${job.id}`, queueName: job.queueName } });
    } catch (error: any) {
      if (error?.code === 'P2002') return { duplicate: true as const };
      throw error;
    }
    const notification = await tx.notification.create({ data: { userId, type, payload } });
    return { duplicate: false as const, notification };
  });
  if (!result.duplicate) await publisher.publish('talentswap:notifications:delivered', JSON.stringify({ userId, notification: result.notification }));
  return result.duplicate ? result : result.notification.id;
}, { connection, concurrency: 10 });

for (const worker of [documentWorker, searchWorker, embeddingWorker, gamificationWorker, notificationWorker]) {
  worker.on('failed', (job, error) => console.error(`[worker] ${worker.name} job ${job?.id} failed: ${error.message}`));
}

async function shutdown() {
  await Promise.all([documentWorker.close(), searchWorker.close(), embeddingWorker.close(), gamificationWorker.close(), notificationWorker.close()]);
  await Promise.all([connection.quit(), publisher.quit(), prisma.$disconnect()]);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('TalentSwap worker started: document-scan, search-sync, skill-embeddings, gamification, notifications');
