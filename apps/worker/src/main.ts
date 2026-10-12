import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { MAX_DOCUMENT_BYTES, scanBufferWithClamAv } from './reliability';

const prisma = new PrismaClient();
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });
const storageBucket = process.env.R2_BUCKET ?? 'talentswap';
const storage = new S3Client({
  region: 'auto',
  ...(process.env.R2_ENDPOINT ? { endpoint: process.env.R2_ENDPOINT } : {}),
  ...(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? { credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }
    : {}),
});

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
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`EMBEDDING_PROVIDER_${response.status}`);
      const json = await response.json() as any;
      const vector = json.data?.[0]?.embedding;
      if (!Array.isArray(vector) || vector.length !== 1536) throw new Error('INVALID_EMBEDDING_RESPONSE');
      return vector;
    } catch (error) {
      last = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (2 ** attempt)));
    }
  }
  throw last instanceof Error ? last : new Error('EMBEDDING_PROVIDER_FAILURE');
}

async function downloadDocument(fileKey: string): Promise<Buffer> {
  if (!fileKey || fileKey.includes('..') || fileKey.startsWith('/')) throw new Error('INVALID_DOCUMENT_KEY');
  const result = await storage.send(new GetObjectCommand({ Bucket: storageBucket, Key: fileKey }));
  const size = result.ContentLength ?? 0;
  if (!Number.isInteger(size) || size <= 0 || size > MAX_DOCUMENT_BYTES) {
    (result.Body as any)?.destroy?.();
    throw new Error('INVALID_OBJECT_SIZE');
  }
  if (!result.Body) throw new Error('EMPTY_OBJECT');
  const bytes = Buffer.from(await result.Body.transformToByteArray());
  if (bytes.length !== size || bytes.length > MAX_DOCUMENT_BYTES) throw new Error('OBJECT_SIZE_MISMATCH');
  return bytes;
}


const documentWorker = new Worker('document-scan', async job => {
  if (job.name !== 'scan') throw new Error(`UNSUPPORTED_DOCUMENT_JOB:${job.name}`);
  const document = await prisma.document.findUnique({ where: { id: job.data.documentId } });
  if (!document) return;
  try {
    const fileKey = String(job.data.fileKey ?? '');
    if (!fileKey.startsWith('users/')) throw new Error('INVALID_DOCUMENT_KEY');
    const bytes = await downloadDocument(fileKey);
    const scan = await scanBufferWithClamAv(bytes);
    if (!scan.clean) {
      await prisma.document.update({ where: { id: document.id }, data: { status: 'REJECTED', scanResult: { engine: 'ClamAV', clean: false, signature: scan.signature } } });
      return;
    }
    await prisma.document.update({ where: { id: document.id }, data: { status: 'PENDING_REVIEW', scanResult: { engine: 'ClamAV', clean: true } } });
  } catch (error) {
    await prisma.document.update({ where: { id: document.id }, data: { status: 'SCANNING', scanResult: { engine: 'ClamAV', lastError: error instanceof Error ? error.message : 'SCAN_FAILED', retrying: true } } });
    throw error;
  }
}, { connection, concurrency: 5 });

async function openSearchRequest(path: string, init: RequestInit = {}) {
  const base = (process.env.OPENSEARCH_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('OPENSEARCH_URL_NOT_CONFIGURED');
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) {
    headers.set('authorization', `Basic ${Buffer.from(`${process.env.OPENSEARCH_USERNAME}:${process.env.OPENSEARCH_PASSWORD}`).toString('base64')}`);
  }
  const response = await fetch(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`OPENSEARCH_HTTP_${response.status}:${(await response.text()).slice(0, 300)}`);
  return response;
}

async function ensureOpenSearchIndex() {
  const base = (process.env.OPENSEARCH_URL ?? '').replace(/\/$/, '');
  if (!base) throw new Error('OPENSEARCH_URL_NOT_CONFIGURED');
  const headers = new Headers();
  if (process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD) headers.set('authorization', `Basic ${Buffer.from(`${process.env.OPENSEARCH_USERNAME}:${process.env.OPENSEARCH_PASSWORD}`).toString('base64')}`);
  const exists = await fetch(`${base}/talentswap-skills`, { method: 'HEAD', headers, signal: AbortSignal.timeout(10_000) });
  if (exists.status === 404) {
    await openSearchRequest('/talentswap-skills', { method: 'PUT', body: JSON.stringify({ mappings: { properties: { title: { type: 'text' }, description: { type: 'text' }, categoryId: { type: 'integer' }, category: { properties: { name: { type: 'text' }, slug: { type: 'keyword' } } }, ownerIsBanned: { type: 'boolean' }, profileVisibility: { type: 'keyword' }, proficiency: { type: 'keyword' }, type: { type: 'keyword' }, pointRate: { type: 'integer' }, updatedAt: { type: 'date' } } } }) });
  } else if (!exists.ok) throw new Error(`OPENSEARCH_INDEX_CHECK_${exists.status}`);
}

async function indexSkill(skillId: string) {
  const skill = await prisma.skill.findUnique({ where: { id: skillId }, include: { category: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, isBanned: true, settings: { select: { profileVisibility: true } }, profile: { select: { displayName: true, headline: true, avatarUrl: true } } } } } });
  if (!skill || !skill.isActive) {
    await openSearchRequest(`/talentswap-skills/_doc/${encodeURIComponent(skillId)}`, { method: 'DELETE' }).catch((error: any) => { if (!String(error?.message).includes('OPENSEARCH_HTTP_404')) throw error; });
    return { removed: skillId };
  }
  const { id, title, description, categoryId, category, proficiency, type, pointRate, updatedAt, user } = skill;
  await openSearchRequest(`/talentswap-skills/_doc/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ title, description, categoryId, category, proficiency, type, pointRate, updatedAt: updatedAt.toISOString(), ownerIsBanned: user.isBanned, profileVisibility: user.settings?.profileVisibility ?? 'PRIVATE', owner: { id: user.id, profile: user.profile } }) });
  return { indexed: id };
}

const searchWorker = new Worker('search-sync', async job => {
  if (job.name === 'index') {
    if ((process.env.SEARCH_BACKEND ?? 'postgres') !== 'opensearch') return { skipped: true, reason: 'POSTGRES_SEARCH_ACTIVE' };
    await ensureOpenSearchIndex();
    return indexSkill(String(job.data.skillId));
  }
  if (job.name === 'delete') {
    if ((process.env.SEARCH_BACKEND ?? 'postgres') !== 'opensearch') return { skipped: true, reason: 'POSTGRES_SEARCH_ACTIVE' };
    await ensureOpenSearchIndex();
    return indexSkill(String(job.data.skillId));
  }
  if (job.name !== 'rebuild') throw new Error(`UNSUPPORTED_SEARCH_JOB:${job.name}`);
  const counts = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*)::bigint AS count FROM skills WHERE is_active = true`);
  if ((process.env.SEARCH_BACKEND ?? 'postgres') === 'opensearch') {
    await ensureOpenSearchIndex();
    let cursor: string | undefined; let indexed = 0;
    while (true) {
      const batch = await prisma.skill.findMany({ where: { isActive: true }, take: 250, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: 'asc' }, include: { category: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, isBanned: true, settings: { select: { profileVisibility: true } }, profile: { select: { displayName: true, headline: true, avatarUrl: true } } } } } });
      if (!batch.length) break;
      const lines = batch.flatMap(skill => { const { id, title, description, categoryId, category, proficiency, type, pointRate, updatedAt, user } = skill; return [JSON.stringify({ index: { _index: 'talentswap-skills', _id: id } }), JSON.stringify({ title, description, categoryId, category, proficiency, type, pointRate, updatedAt: updatedAt.toISOString(), ownerIsBanned: user.isBanned, profileVisibility: user.settings?.profileVisibility ?? 'PRIVATE', owner: { id: user.id, profile: user.profile } })]; });
      const response = await openSearchRequest('/_bulk', { method: 'POST', headers: { 'content-type': 'application/x-ndjson' }, body: `${lines.join('\n')}\n` });
      const result = await response.json() as any; if (result.errors) throw new Error('OPENSEARCH_BULK_REBUILD_CONTAINS_ERRORS');
      indexed += batch.length; cursor = batch[batch.length - 1].id; if (batch.length < 250) break;
    }
    return { rebuilt: indexed, index: 'talentswap-skills', backend: 'opensearch' };
  }
  await prisma.$executeRawUnsafe(`REINDEX INDEX CONCURRENTLY skills_search_vector_gin_idx`);
  return { rebuilt: Number(counts[0]?.count ?? 0), index: 'skills_search_vector_gin_idx', backend: 'postgres' };
}, { connection, concurrency: 1 });

const embeddingWorker = new Worker('skill-embeddings', async job => {
  if (job.name !== 'skill-embed') throw new Error(`UNSUPPORTED_EMBEDDING_JOB:${job.name}`);
  const skill = await prisma.skill.findUnique({ where: { id: job.data.skillId }, select: { id: true, isActive: true, title: true, description: true, updatedAt: true } });
  if (!skill || !skill.isActive) return { skipped: true };
  // Always embed the latest committed source text; queued payloads can be stale
  // when edits are made rapidly and jobs complete out of order.
  const vector = await embed(`${skill.title}\n${skill.description}`);
  const encoded = `[${vector.join(',')}]`;
  // Conditional update prevents an older, slower embedding request from
  // overwriting the vector after a newer skill edit has committed.
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE skills SET embedding = $1::vector WHERE id = $2::uuid AND updated_at = $3 AND is_active = true`,
    encoded,
    skill.id,
    skill.updatedAt,
  );
  return Number(updated) === 1 ? { embedded: skill.id } : { skipped: true, reason: 'SKILL_CHANGED_DURING_EMBEDDING' };
}, { connection, concurrency: 2 });

const gamificationWorker = new Worker('gamification', async job => {
  if (job.name !== 'award-xp') throw new Error(`UNSUPPORTED_GAMIFICATION_JOB:${job.name}`);
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
  if (job.name !== 'persist') throw new Error(`UNSUPPORTED_NOTIFICATION_JOB:${job.name}`);
  const { userId, type, payload } = job.data as { userId: string; type: string; payload: unknown };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) throw new Error('INVALID_NOTIFICATION_USER_ID');
  if (typeof type !== 'string' || !type.trim() || type.length > 100 || payload === undefined) throw new Error('INVALID_NOTIFICATION_PAYLOAD');
  const jobId = `${job.queueName}:${job.id}`;
  let notification: any = null;
  try {
    notification = await prisma.$transaction(async tx => {
      const existing = await tx.workerJobReceipt.findUnique({ where: { jobId }, select: { resultId: true } });
      if (existing) {
        return existing.resultId ? tx.notification.findUnique({ where: { id: existing.resultId } }) : null;
      }
      await tx.workerJobReceipt.create({ data: { jobId, queueName: job.queueName } });
      const created = await tx.notification.create({ data: { userId, type: type as any, payload: payload as any } });
      await tx.workerJobReceipt.update({ where: { jobId }, data: { resultId: created.id } });
      return created;
    });
  } catch (error: any) {
    // A stalled-job duplicate can race the first processor. Read the committed
    // receipt after the unique-key conflict, then re-publish the same record.
    if (error?.code !== 'P2002') throw error;
    const receipt = await prisma.workerJobReceipt.findUnique({ where: { jobId }, select: { resultId: true } });
    notification = receipt?.resultId ? await prisma.notification.findUnique({ where: { id: receipt.resultId } }) : null;
    if (!notification) throw error;
  }
  if (notification) await publisher.publish('talentswap:notifications:delivered', JSON.stringify({ userId, notification }));
  return notification?.id ?? { duplicate: true };
}, { connection, concurrency: 10 });

const workers = [documentWorker, searchWorker, embeddingWorker, gamificationWorker, notificationWorker];
for (const worker of workers) {
  worker.on('failed', (job, error) => {
    console.error(`[worker] queue=${worker.name} job=${job?.id ?? 'unknown'} attempts=${job?.attemptsMade ?? 0} error=${error.message}`);
    if (worker === documentWorker && job?.name === 'scan' && job.data?.documentId) {
      const maxAttempts = Number(job.opts.attempts ?? 1);
      if (job.attemptsMade >= maxAttempts) {
        void prisma.document.update({
          where: { id: String(job.data.documentId) },
          data: { status: 'SCAN_FAILED', scanResult: { engine: 'ClamAV', error: 'SCAN_RETRIES_EXHAUSTED', attempts: job.attemptsMade } },
        }).catch(updateError => console.error(`[worker] failed to persist scan failure for document=${job.data.documentId}: ${updateError instanceof Error ? updateError.message : 'UNKNOWN'}`));
      }
    }
  });
  worker.on('error', error => console.error(`[worker] queue=${worker.name} error=${error.message}`));
}
connection.on('error', error => console.error(`[worker] redis connection error=${error.message}`));
publisher.on('error', error => console.error(`[worker] redis publisher error=${error.message}`));

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[worker] graceful shutdown started');
  try {
    await Promise.all(workers.map(worker => worker.close()));
    await Promise.allSettled([connection.quit(), publisher.quit(), prisma.$disconnect()]);
    await storage.destroy();
    process.exitCode = 0;
  } catch (error) {
    console.error(`[worker] shutdown error=${error instanceof Error ? error.message : 'UNKNOWN'}`);
    process.exitCode = 1;
  }
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

console.log('TalentSwap worker started: document-scan, search-sync (PostgreSQL/OpenSearch), skill-embeddings, gamification, notifications');
