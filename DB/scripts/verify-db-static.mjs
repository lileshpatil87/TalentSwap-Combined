#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const schemaPath = path.join(root, 'apps/api/prisma/schema.prisma');
const migrationsPath = path.join(root, 'apps/api/prisma/migrations');

const read = (file) => fs.readFileSync(file, 'utf8');
const schema = read(schemaPath);
const entries = fs.readdirSync(migrationsPath)
  .filter((name) => fs.statSync(path.join(migrationsPath, name)).isDirectory())
  .sort();

const expected = [
  '20260809020000_core_users_auth_profiles_schema',
  '20261008130000_db03_profiles_balance_trigger',
  '20261008130100_db04_skills_categories',
  '20261008130200_db05_skill_points_ledger',
  '20261008130300_db06_transactions',
  '20261008130400_db07_chat',
  '20261008130500_db08_notifications',
  '20261008130600_db09_documents',
  '20261008130700_db10_gamification',
  '20261008130800_db11_ratings',
  '20261008130900_db12_community',
  '20261008131000_db13_admin_logs',
  '20261008131100_db14_fts',
  '20261008131200_db15_calling',
  '20261008131300_db16_pgvector',
  '20261008131400_db17_indexing_performance',
  '20261008131500_db17_index_corrections',
  '20261008131600_db17_vector_completion',
];

if (JSON.stringify(entries) !== JSON.stringify(expected)) {
  throw new Error(`Migration chain mismatch. Expected:\n${expected.join('\n')}\n\nFound:\n${entries.join('\n')}`);
}

const requiredModels = [
  'users','profiles','skill_categories','skills','skill_points_ledger',
  'transactions','conversations','messages','notifications','documents',
  'badges','user_badges','activity_streaks','ratings','community_posts',
  'admin_logs','call_sessions'
];
for (const table of requiredModels) {
  const modelPattern = new RegExp(`model\\s+\\w+[\\s\\S]*?@@map\\("${table}"\\)`,'m');
  if (!modelPattern.test(schema)) throw new Error(`Missing Prisma model mapping for ${table}`);
}

const requiredSchemaFragments = [
  ['Skill FTS projection', 'searchVector Unsupported("tsvector")'],
  ['Skill vector projection', 'embedding Unsupported("vector(1536)")'],
  ['Profile vector projection', 'embedding Unsupported("vector(1536)")'],
  ['Ledger amount invariant', 'amount Int'],
  ['Transaction idempotency', 'idempotencyKey String @unique'],
  ['Rating uniqueness', '@@unique([transactionId, raterId])'],
];
for (const [label, fragment] of requiredSchemaFragments) {
  if (!schema.includes(fragment)) throw new Error(`${label} missing from schema.prisma`);
}

for (const dir of entries) {
  const sqlPath = path.join(migrationsPath, dir, 'migration.sql');
  const sql = read(sqlPath);
  if (!sql.trim()) throw new Error(`Empty migration: ${dir}`);
}

const migration = (name) => read(path.join(migrationsPath, name, 'migration.sql'));
const checks = [
  ['DB-03 trigger function', migration(expected[1]).includes('CREATE OR REPLACE FUNCTION trg_sync_skill_points')],
  ['DB-04 skills table', migration(expected[2]).includes('CREATE TABLE "skills"')],
  ['DB-05 ledger trigger', migration(expected[3]).includes('CREATE TRIGGER "trg_sync_skill_points"')],
  ['DB-05 append-only revoke', migration(expected[3]).includes('REVOKE UPDATE, DELETE, TRUNCATE ON "skill_points_ledger" FROM PUBLIC')],
  ['DB-06 transaction FK', migration(expected[4]).includes('skill_points_ledger_transaction_id_fkey')],
  ['DB-07 messages', migration(expected[5]).includes('CREATE TABLE "messages"')],
  ['DB-08 notifications', migration(expected[6]).includes('CREATE TABLE "notifications"')],
  ['DB-09 document states', migration(expected[7]).includes('CREATE TYPE "document_status"')],
  ['DB-10 badges', migration(expected[8]).includes('CREATE TABLE "badges"')],
  ['DB-11 rating uniqueness', migration(expected[9]).includes('ratings_transaction_id_rater_id_key')],
  ['DB-12 community', migration(expected[10]).includes('CREATE TABLE "community_posts"')],
  ['DB-13 audit immutability grant boundary', migration(expected[11]).includes('REVOKE UPDATE, DELETE, TRUNCATE ON "admin_logs" FROM PUBLIC')],
  ['DB-14 FTS GIN index', migration(expected[12]).includes('skills_search_vector_gin_idx')],
  ['DB-15 call sessions', migration(expected[13]).includes('CREATE TABLE "call_sessions"')],
  ['DB-16 pgvector extension', migration(expected[14]).includes('CREATE EXTENSION IF NOT EXISTS vector')],
  ['DB-16 profile embedding', migration(expected[14]).includes('ALTER TABLE "profiles"') && migration(expected[14]).includes('"embedding" vector')],
  ['DB-17 final review migration', migration(expected[15]).includes('DB-17 — Final indexing and performance review')],
  ['DB-17 index correction migration', migration(expected[16]).includes('WHERE \"is_active\" = true') && migration(expected[16]).includes('WHERE \"is_read\" = false')],
  ['DB-17 vector completion migration', migration(expected[17]).includes('vector(1536)') && migration(expected[17]).includes('USING hnsw') && migration(expected[17]).includes('vector_cosine_ops')],
];
for (const [label, ok] of checks) if (!ok) throw new Error(`${label} check failed`);

const finalIndexMigration = migration(expected[16]);
if (!finalIndexMigration.includes('DROP INDEX IF EXISTS \"skills_user_id_is_active_idx\"') || !finalIndexMigration.includes('CREATE INDEX \"skills_user_id_is_active_idx\"')) {
  throw new Error('DB-17 skills active-listing index correction missing');
}
if (!finalIndexMigration.includes('DROP INDEX IF EXISTS \"notifications_user_id_is_read_idx\"') || !finalIndexMigration.includes('CREATE INDEX \"notifications_user_id_is_read_idx\"')) {
  throw new Error('DB-17 notifications unread index correction missing');
}



const allMigrations = entries.map((dir) => read(path.join(migrationsPath, dir, 'migration.sql'))).join('\n');
const requiredIndexMarkers = [
  'profiles_reputation_score_idx',
  'profiles_last_active_at_idx',
  'skills_search_vector_gin_idx',
  'skills_category_id_is_active_idx',
  'transactions_initiator_id_status_idx',
  'transactions_provider_id_status_idx',
  'transactions_confirmation_deadline_idx',
  'skill_points_ledger_user_id_created_at_idx',
  'messages_conversation_id_sent_at_idx',
  'documents_user_id_status_idx',
  'user_badges_user_id_idx',
];
for (const marker of requiredIndexMarkers) {
  if (!allMigrations.includes(marker)) throw new Error(`Specification §4.2 index missing: ${marker}`);
}
if (!allMigrations.includes('WHERE "is_active" = true')) {
  throw new Error('Specification §4.2 active skills partial predicate missing');
}
if (!allMigrations.includes('WHERE "is_read" = false')) {
  throw new Error('Specification §4.2 unread notifications partial predicate missing');
}
if (!allMigrations.includes('vector(1536)') || !allMigrations.includes('skills_embedding_hnsw_idx') || !allMigrations.includes('profiles_embedding_hnsw_idx')) {
  throw new Error('DB-16/DB-17 vector dimension or HNSW index missing');
}

console.log(`Static DB verification passed: ${entries.length} migrations inspected in canonical order.`);
console.log(`Schema verification passed: ${requiredModels.length} required Prisma table mappings and critical invariants checked.`);
console.log('Live PostgreSQL/Prisma execution must be run in an environment with PostgreSQL and Prisma engines.');
