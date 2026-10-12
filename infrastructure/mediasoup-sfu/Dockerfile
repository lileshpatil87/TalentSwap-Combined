FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ pkg-config && rm -rf /var/lib/apt/lists/*
COPY package.json tsconfig.json ./
RUN npm install --include=dev
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd --system --uid 10001 sfu
COPY --from=build --chown=sfu:sfu /app/node_modules ./node_modules
COPY --from=build --chown=sfu:sfu /app/dist ./dist
COPY --from=build --chown=sfu:sfu /app/package.json ./package.json
USER sfu
EXPOSE 4100 40000-49999/udp 40000-49999/tcp
CMD ["node", "dist/server.js"]
