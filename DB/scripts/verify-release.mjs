#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'README.md', '.nvmrc', '.env.db.example', 'docker-compose.db.yml',
  'apps/api/package.json', 'apps/api/prisma/schema.prisma', 'apps/api/prisma/seed.ts',
  'scripts/verify-db-static.mjs', 'scripts/verify-db-final.sql',
  'scripts/verify-db-integration.sql', 'scripts/run-db-tests.sh', 'scripts/run-all-db-validation.sh',
  'docs/database/DB-03-to-DB-17-final-report.md', 'docs/database/DB-17-performance-review.md',
  'docs/database/DB-16-pgvector.md', 'docs/architecture/ERD-DB-03-to-DB-17.md',
  'scripts/test-db-concurrency.sh'
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Required release file missing: ${rel}`);
}

const migrationsDir = path.join(root, 'apps/api/prisma/migrations');
const migrations = fs.readdirSync(migrationsDir).filter(n => fs.statSync(path.join(migrationsDir, n)).isDirectory()).sort();
if (migrations.length !== 18) throw new Error(`Expected 18 cumulative migrations, found ${migrations.length}`);
for (const name of migrations) {
  const sql = fs.readFileSync(path.join(migrationsDir, name, 'migration.sql'), 'utf8').trim();
  if (!sql) throw new Error(`Empty migration: ${name}`);
}

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const apiPkg = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
for (const script of ['verify:db:static','test:db','verify:db','db:generate','db:validate','db:migrate','db:seed']) {
  if (!rootPkg.scripts[script]) throw new Error(`Missing root DB script: ${script}`);
}
for (const dep of ['@prisma/client','bcrypt']) {
  if (!apiPkg.dependencies[dep]) throw new Error(`Missing runtime dependency: ${dep}`);
}
for (const dep of ['prisma','ts-node','typescript']) {
  if (!apiPkg.devDependencies[dep]) throw new Error(`Missing dev dependency: ${dep}`);
}

const forbidden = ['apps/web', 'apps/api/src', 'packages'];
for (const rel of forbidden) {
  if (fs.existsSync(path.join(root, rel))) throw new Error(`Database-only release unexpectedly contains ${rel}`);
}

const schema = fs.readFileSync(path.join(root, 'apps/api/prisma/schema.prisma'), 'utf8');
for (const fragment of ['searchVector Unsupported("tsvector")','embedding Unsupported("vector(1536)")','model SkillPointsLedger','model Transaction','model AdminLog']) {
  if (!schema.includes(fragment)) throw new Error(`Schema release marker missing: ${fragment}`);
}

const integration = fs.readFileSync(path.join(root, 'scripts/verify-db-integration.sql'), 'utf8');
for (const fragment of ['ledger rejects wrong balance snapshot','ledger rejects overdraft','completed transaction requires completed_at','duplicate rating rejected','FTS vector regenerates after update','vector value stored','admin logs revoke UPDATE from PUBLIC']) {
  if (!integration.includes(fragment)) throw new Error(`Integration test missing: ${fragment}`);
}

console.log(`Release verification passed: ${migrations.length} migrations, ${required.length} required release artifacts, and comprehensive DB integration tests present.`);
