#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Install Node.js 20 LTS or newer.' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Install Docker and Docker Compose.' >&2; exit 1; }
corepack enable
corepack prepare pnpm@9.0.0 --activate
[[ -f .env ]] || cp .env.example .env
[[ -f apps/web/.env.local ]] || cp apps/web/.env.example apps/web/.env.local
[[ -f apps/api/.env ]] || cp apps/api/.env.example apps/api/.env
printf '\nReview .env and apps/api/.env; configure valid development JWT keys before starting.\n'
read -r -p 'Continue with dependency installation and local infrastructure? (y/N) ' answer
[[ "$answer" == y || "$answer" == Y ]] || exit 0
corepack pnpm install --no-frozen-lockfile
docker compose up -d postgres redis
corepack pnpm db:generate
corepack pnpm db:migrate
printf '\nSetup complete. Start app in separate terminals: corepack pnpm dev:api and corepack pnpm dev:web\n'
