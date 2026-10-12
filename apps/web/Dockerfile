# apps/web/Dockerfile
#
# TalentSwap Next.js frontend.
#
# IMPORTANT (DEV-CON-v1.0 §9.2): this Dockerfile exists for LOCAL DOCKER
# COMPOSE PARITY ONLY, plus a documented future self-hosted fallback path.
# Production deployment uses Vercel's native Next.js build pipeline
# (Technology Specification §2.7.1) — this image is never the production
# build path while Vercel remains the chosen host.
#
# Prerequisite: assumes the pnpm workspace scaffold (FOUND-01) exists.
# Build context: repository root (see infrastructure/docker/docker-compose.yml).

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter=@talentswap/web...

# ---------------------------------------------------------------------
# Stage: development — used by docker-compose.yml's `target: development`
# ---------------------------------------------------------------------
FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
USER node
CMD ["pnpm", "--filter", "@talentswap/web", "dev"]

# ---------------------------------------------------------------------
# Stage: build (self-hosted fallback path only — not used by Vercel)
# ---------------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
COPY . .
RUN pnpm --filter=@talentswap/web... build

# ---------------------------------------------------------------------
# Stage: runtime (self-hosted fallback path only — not used by Vercel)
# ---------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S talentswap && adduser -S talentswap -G talentswap
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
USER talentswap
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode<500?0:1)).on('error', () => process.exit(1))"
CMD ["node_modules/.bin/next", "start"]
