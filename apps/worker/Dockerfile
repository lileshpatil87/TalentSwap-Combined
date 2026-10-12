FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter=@talentswap/worker...
COPY apps/worker ./apps/worker
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @talentswap/api prisma:generate && pnpm --filter @talentswap/worker build

FROM node:20-alpine
RUN addgroup -S talentswap && adduser -S talentswap -G talentswap
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=talentswap:talentswap /app ./
USER talentswap
CMD ["node", "apps/worker/dist/main.js"]
