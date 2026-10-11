import fs from 'node:fs';
import path from 'node:path';

const moduleName = process.argv[2];
if (!moduleName || !/^[a-z][a-z0-9-]*$/.test(moduleName)) {
  throw new Error('Usage: pnpm generate:module <module-name>');
}
const dir = path.resolve('apps/api/src/modules', moduleName);
if (fs.existsSync(dir)) throw new Error(`Module already exists: ${moduleName}`);
fs.mkdirSync(dir, { recursive: true });
const pascal = moduleName.split('-').map(x => x[0].toUpperCase() + x.slice(1)).join('');
fs.writeFileSync(path.join(dir, `${moduleName}.module.ts`), `import { Module } from '@nestjs/common';\n\n@Module({})\nexport class ${pascal}Module {}\n`);
console.log(`Created apps/api/src/modules/${moduleName}`);
