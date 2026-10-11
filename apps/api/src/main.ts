import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { AppModule } from './app.module';
import type { AppConfig, CorsConfig } from './config/configuration';
import { createWinstonConfig } from './logger/winston.config';

/**
 * Bootstrap. Per ADR-0002 (Architecture Foundation §18 Amendment Log):
 * launches on the NestJS default Express adapter (`NestExpressApplication`),
 * not Fastify — the Fastify swap is deferred to a measured, scale-triggered
 * later change with zero application-code cost.
 */
async function bootstrap(): Promise<void> {
  // Winston must exist before Nest's own bootstrap logging runs, so
  // construct it from raw `process.env` here — this is the one
  // permitted exception to "no module reads process.env directly"
  // (Architecture Foundation §8.2), since `ConfigService` itself isn't
  // constructed until `NestFactory.create` runs.
  const bootstrapLogger = WinstonModule.createLogger(
    createWinstonConfig({
      level: process.env.LOG_LEVEL ?? 'info',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    }),
  );

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: bootstrapLogger,
  });

  // Re-fetch the logger via DI so the rest of the app (and Winston-backed
  // providers like GlobalExceptionFilter/LoggingInterceptor) share the
  // exact same configured instance.
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;
  const corsConfig = configService.get<CorsConfig>('cors')!;

  const redisAdapter = new RedisIoAdapter(app, configService);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  // --- Security headers (Technology Specification §2.6) ---
  app.use(helmet());

  // --- Cookie parsing (auth module, BE-02) ---
  // Only ever used to read the httpOnly refresh-token cookie
  // (`REFRESH_TOKEN_COOKIE_NAME`) — no signed-cookie secret is configured
  // because the refresh token itself is already an opaque, server-hashed
  // random value (Spec §8.2); a forged cookie value simply fails the
  // `token_hash` lookup in `AuthRepository`.
  app.use(cookieParser());

  // --- CORS allowlist, never a wildcard (Architecture Foundation §13 rule 3) ---
  app.enableCors({
    origin: corsConfig.origins,
    credentials: true,
  });

  // --- API versioning: URL path prefix only (Architecture Foundation §9.7) ---
  // Health/readiness probes are excluded from the versioned prefix — they
  // are an infra-level contract (container orchestration, uptime
  // monitoring, DEPLOY-05), not a versioned business resource. This also
  // matches what container/compose health checks conventionally expect
  // at a bare `/health` path. (Integration review, 2026-08: this was the
  // one concrete cross-zip bug inside backend-foundation's own control —
  // docker-compose.yml, the Dockerfile HEALTHCHECK, and the onboarding
  // docs all probe unprefixed `/health`; excluding it here fixes the
  // mismatch without touching those DevOps-owned files.)
  app.setGlobalPrefix(appConfig.apiPrefix, {
    exclude: ['health', 'health/(.*)'],
  });

  // --- Swagger / OpenAPI (Backend Constitution §54 — generated, never hand-edited) ---
  if (appConfig.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TalentSwap API')
      .setDescription('TalentSwap backend REST API.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // --- Graceful shutdown (SIGTERM/SIGINT trigger Nest's onModuleDestroy hooks) ---
  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  bootstrapLogger.log(
    `TalentSwap API listening on port ${appConfig.port} (prefix: /${appConfig.apiPrefix}, env: ${appConfig.nodeEnv})`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap:');
  console.dir(error, { depth: null });
  if (error instanceof Error) {
    console.error(error.stack);
  }
  process.exit(1);
});
