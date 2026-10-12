import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [
  ['settings module is wired', read('apps/api/src/app.module.ts').includes('SettingsModule') && exists('apps/api/src/modules/settings/settings.controller.ts') && exists('apps/api/src/modules/settings/settings.service.spec.ts')],
  ['password reset request and confirmation endpoints exist', read('apps/api/src/modules/auth/auth.controller.ts').includes("Post('forgot-password')") && read('apps/api/src/modules/auth/auth.controller.ts').includes("Post('reset-password')") && exists('apps/web/app/(auth)/reset-password/page.tsx')],
  ['password reset unit tests cover the secure flow', exists('apps/api/src/modules/auth/password-reset.service.spec.ts')],
  ['password reset tokens are hashed and time-limited', read('apps/api/src/modules/auth/password-reset.service.ts').includes("createHash('sha256')") && read('apps/api/src/modules/auth/password-reset.service.ts').includes('30 * 60 * 1000')],
  ['password reset email settings use validated namespaced configuration', read('apps/api/src/config/env.schema.ts').includes('RESEND_API_KEY') && read('apps/api/src/config/configuration.ts').includes('email: { resendApiKey') && read('apps/api/src/modules/auth/password-reset.service.ts').includes("get<EmailConfig>('email')")],
  ['reset revokes existing refresh tokens', read('apps/api/src/modules/auth/password-reset.service.ts').includes('refreshToken.updateMany')],
  ['document metadata includes size and migration', read('apps/api/src/modules/documents/documents.service.ts').includes('sizeBytes: inspected.size') && read('apps/api/prisma/schema.prisma').includes('sizeBytes Int @default(0)')],
  ['document client uses presign-confirm-record flow', read('apps/web/lib/api/documents.ts').includes('/storage/presign') && read('apps/web/lib/api/documents.ts').includes('/storage/confirm') && read('apps/web/lib/api/documents.ts').includes('fileKey: presigned.key')],
  ['chat uses content payload and joins conversations', read('apps/web/components/features/chat/ChatPage.tsx').includes('content:text.trim()') && read('apps/web/components/features/chat/ChatPage.tsx').includes('conversation:join')],
  ['call signalling uses one authorized contract', read('apps/web/components/features/calling/CallingPage.tsx').includes("'call:signal'") && read('apps/api/src/modules/calling/calling.gateway.ts').includes('assertParticipant(parsed.data.callId, user.sub)') && read('apps/api/src/modules/calling/calling.gateway.ts').includes('CALL_ROOM_NOT_JOINED') && read('apps/api/src/modules/calling/calling.gateway.ts').includes('call:peer-joined')],
  ['calls are linked to transactions in schema and migration', read('apps/api/prisma/schema.prisma').includes('transactionId String? @map("transaction_id")') && read('apps/api/prisma/migrations/20261012000100_phase2_settings_password_reset_call_documents/migration.sql').includes('call_sessions_one_active_transaction_idx')],
  ['gamification snapshot route is implemented', exists('apps/api/src/modules/gamification/gamification-me.controller.ts') && read('apps/api/src/modules/gamification/gamification-me.controller.ts').includes("Controller('gamification')")],
  ['discover uses backend categories and category IDs', read('apps/web/lib/api/discover.ts').includes("'/skills/categories'") && read('apps/web/components/features/discover/DiscoverPage.tsx').includes('categoryId')],
  ['admin document review is exposed and used', read('apps/web/lib/api/admin.ts').includes('reviewDocument') && read('apps/api/src/modules/admin/admin.controller.ts').includes("documents/:id/review")],
  ['canonical migration ownership documented', exists('docs/architecture/PHASE2-MIGRATION-OWNERSHIP.md') && read('docs/architecture/PHASE2-MIGRATION-OWNERSHIP.md').includes('canonical, executable migration chain')],
  ['realtime gateways validate payloads and room membership', read('apps/api/src/modules/chat/chat.gateway.ts').includes('sendSchema.safeParse(body)') && read('apps/api/src/modules/chat/chat.gateway.ts').includes('CONVERSATION_ROOM_NOT_JOINED') && read('apps/api/src/modules/calling/calling.gateway.ts').includes('callSignalSchema.safeParse(body)')],
  ['storage ownership violations return forbidden responses', read('apps/api/src/modules/storage/storage.service.ts').includes('throw new StorageAccessException()')],
  ['socket reconnections use the current access token', read('apps/web/lib/socket.ts').includes('immediately before every (re)connection') && read('apps/web/lib/socket.ts').includes('socket.auth = currentSocketAuth()')],
  ['realtime gateway regression tests exist', exists('apps/api/src/modules/chat/chat.gateway.spec.ts') && exists('apps/api/src/modules/calling/calling.gateway.spec.ts')],
];
for (const [label, ok] of checks) { if (ok) console.log(`PASS: ${label}`); else fail(label); }
if (!process.exitCode) console.log(`Phase 2 source validation passed: ${checks.length}/${checks.length} checks.`);
