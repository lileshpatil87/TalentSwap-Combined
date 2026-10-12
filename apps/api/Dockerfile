FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter=@talentswap/api...
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
RUN pnpm --filter @talentswap/api prisma:generate && pnpm --filter @talentswap/api build

FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && addgroup -S talentswap && adduser -S talentswap -G talentswap
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=talentswap:talentswap /app ./
USER talentswap
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:4000/health',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["pnpm", "--filter", "@talentswap/api", "start:prod"]
