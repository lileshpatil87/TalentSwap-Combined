import type { EnvVars } from './env.schema';

/**
 * Namespaced application configuration shape.
 *
 * Modules never read `process.env` directly (Architecture Foundation §8.2)
 * — they inject `ConfigService` and read `configService.get<AppConfig>('app')`,
 * `configService.get<DatabaseConfig>('database')`, etc. Namespacing keeps
 * the flat env-var list organized into the same groupings this document's
 * other sections already use (app, cors, database, redis, throttle).
 */
export interface AppConfig {
  nodeEnv: EnvVars['NODE_ENV'];
  port: number;
  apiPrefix: string;
  swaggerEnabled: boolean;
  logLevel: EnvVars['LOG_LEVEL'];
}

export interface CorsConfig {
  origins: string[];
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  url: string;
}

export interface ThrottleConfig {
  ttlSeconds: number;
  limit: number;
}

/**
 * Owned by the `auth` module (BE-02). `jwtPrivateKey`/`jwtPublicKey` are
 * already un-escaped, ready-to-use PEM strings (see `normalizePem` below)
 * — no consumer of this config should need to touch `\n`-escaping again.
 */
export interface AuthConfig {
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtIssuer: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  refreshTokenCookieName: string;
  bcryptSaltRounds: number;
}

export interface StorageConfig { endpoint?: string | undefined; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrl?: string | undefined; }
export interface AiConfig { apiKey: string; embeddingModel: string; }
export interface AgoraConfig { appId: string; appCertificate: string; }

export interface RootConfig {
  app: AppConfig;
  cors: CorsConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  throttle: ThrottleConfig;
  auth: AuthConfig;
  storage: StorageConfig;
  ai: AiConfig;
  agora: AgoraConfig;
}

/**
 * PEM keys are supplied as a single-line environment variable with
 * literal `\n` sequences standing in for real newlines (the only format
 * that survives `.env` files, Docker Compose `env_file:`, and most
 * secrets-manager UIs unchanged — Architecture Foundation §8.3). This
 * converts the escaped form back into a real multi-line PEM string. If a
 * value already contains real newlines (e.g. injected directly as a
 * multi-line secret in some hosting platforms), it is returned unchanged.
 */
function normalizePem(value: string): string {
  if (!value) return '';
  return value
    .replace(/\r/g, '')
    .replace(/\\r/g, '')
    .replace(/\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

/**
 * ConfigModule `load` factory. Receives already-`validateEnv`-checked
 * `process.env` values (validation runs first per Nest's ConfigModule
 * lifecycle) and reshapes them into the namespaced `RootConfig` above.
 */
export default (): RootConfig => ({
  app: {
    nodeEnv: (process.env.NODE_ENV as EnvVars['NODE_ENV']) ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    swaggerEnabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    logLevel: (process.env.LOG_LEVEL as EnvVars['LOG_LEVEL']) ?? 'info',
  },
  cors: {
    origins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '200', 10),
  },
  storage: { endpoint: process.env.R2_ENDPOINT, bucket: process.env.R2_BUCKET ?? 'talentswap', accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '', publicUrl: process.env.R2_PUBLIC_URL },
  ai: { apiKey: process.env.OPENAI_API_KEY ?? '', embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small' },
  agora: { appId: process.env.AGORA_APP_ID ?? '', appCertificate: process.env.AGORA_APP_CERTIFICATE ?? '' },
  auth: {
    jwtPrivateKey: normalizePem(process.env.JWT_PRIVATE_KEY ?? ''),
    jwtPublicKey: normalizePem(process.env.JWT_PUBLIC_KEY ?? ''),
    jwtIssuer: process.env.JWT_ISSUER ?? 'talentswap-api',
    accessTokenTtlSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '900', 10),
    refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '30', 10),
    refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'talentswap_refresh_token',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  },
});
