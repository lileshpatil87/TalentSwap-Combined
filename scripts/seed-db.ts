import { execFileSync } from 'node:child_process';
execFileSync('pnpm', ['--filter', '@talentswap/api', 'prisma:seed'], { stdio: 'inherit' });
