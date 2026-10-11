import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('apps/api/src/modules');
const violations: string[] = [];
const domainDirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

function walk(dir: string): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.ts')) continue;

    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(root, file);
    const owner = rel.split(path.sep)[0];
    const isRepository = entry.name.endsWith('.repository.ts');
    const isServiceOrController = entry.name.endsWith('.service.ts') || entry.name.endsWith('.controller.ts');

    if (isServiceOrController && !isRepository && text.includes("from '@app/database/prisma.service'")) {
      violations.push(`${rel}: PrismaService must only be used in repositories`);
    }

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!match) continue;
      const importPath = match[1];
      const domainMatch = importPath.match(/(?:^|\/)modules\/([^/]+)\/([^/]+)\.repository$/);
      if (domainMatch && domainMatch[1] !== owner) {
        violations.push(`${rel}: direct repository import from ${domainMatch[1]}`);
      }
    }
  }
}

walk(root);
if (violations.length) {
  console.error('Boundary violations found:\n' + [...new Set(violations)].join('\n'));
  process.exit(1);
}
console.log('Boundary check passed.');
