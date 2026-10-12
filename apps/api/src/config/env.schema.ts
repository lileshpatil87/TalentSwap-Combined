import { z } from 'zod';

/**
 * Environment schema — the single source of truth for what variables the
 * application requires to boot, and how they are shaped.
 *
 * Per Architecture Foundation §8.2: the app validates its environment at
 * boot and fails fast (crashes on startup, not on first request) if a
 * required variable is missing or malformed. No module should read
 * `process.env.X` directly anywhere else in the codebase — always go
 * through ConfigService, which is typed against `EnvVars` below.
 *
 * Foundation scope: only variables the bootstrap/database/cache/config
 * layers need are declared here. Each domain module extends this schema
 * (in the same file, additively) when it introduces variables it owns —
 * e.g. `auth` adds `JWT_*`, `calling` adds `AGORA_*`. This file is never
 * duplicated per module.
 */
export const envSchema = z.object({
  // --- Application ---
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().min(1).default('api/v1'),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // --- CORS ---
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),

  // --- Logging ---
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // --- Database ---
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
  DATABASE_READ_URL: z.string().url().optional().or(z.literal('')),

  // --- Redis ---
  REDIS_URL: z.string().url({ message: 'REDIS_URL must be a valid connection string' }),

  // --- Rate limiting (Backend Constitution §40) ---
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(200),

  // --- Auth: JWT access tokens (owned by the `auth` module, BE-02) ---
  // RS256 asymmetric signing per Spec §2.2.4/§8.2 and Backend Constitution
  // §30. PEM content, `\n`-escaped on one line (see `.env.example` for the
  // exact format) — `normalizePem()` in `configuration.ts` un-escapes it.
  JWT_PRIVATE_KEY: z
    .string()
    .min(1, { message: 'JWT_PRIVATE_KEY is required (RS256 private key, PEM, \\n-escaped)' }),
  JWT_PUBLIC_KEY: z
    .string()
    .min(1, { message: 'JWT_PUBLIC_KEY is required (RS256 public key, PEM, \\n-escaped)' }),
  JWT_ISSUER: z.string().min(1).default('talentswap-api'),
  // 15-minute default per Spec §2.2.4.
  JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  // --- Auth: refresh tokens (owned by the `auth` module, ADR-0003) ---
  // 30-day default per Spec §2.2.4. Delivered as an httpOnly, Secure,
  // SameSite=Strict cookie — never in a JSON response body.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default('talentswap_refresh_token'),

  // --- Auth: password hashing (owned by the `auth` module) ---
  // Cost factor 12 per Spec §2.6. Bounded to a sane range so a
  // misconfigured value can't silently make login pathologically slow
  // (>~15) or cryptographically weak (<10).
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // --- Object storage / AI / calling (optional in local development) ---
  R2_ENDPOINT: z.string().url().optional().or(z.literal('')),
  R2_BUCKET: z.string().default('talentswap'),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_PUBLIC_URL: z.string().url().optional().or(z.literal('')),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AGORA_APP_ID: z.string().default(''),
  AGORA_APP_CERTIFICATE: z.string().default(''),

  // --- Password-reset email delivery (optional locally; required to use reset flow) ---
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default(''),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  CLAMAV_HOST: z.string().default('clamav'),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
  SEARCH_BACKEND: z.enum(['postgres', 'opensearch']).default('postgres'),
  OPENSEARCH_URL: z.string().url().optional().or(z.literal('')),
  OPENSEARCH_USERNAME: z.string().default(''),
  OPENSEARCH_PASSWORD: z.string().default(''),
  SFU_SHARED_SECRET: z.string().default(''),
  SFU_PUBLIC_URL: z.string().url().optional().or(z.literal('')),
  SFU_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  POSTHOG_PROJECT_KEY: z.string().default(''),
  POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
});

export type EnvVars = z.infer<typeof envSchema>;

/**
 * Fail-fast validator wired into ConfigModule.forRoot({ validate }).
 * Throwing here crashes the Nest bootstrap process before any request can
 * be served — this is deliberate (Architecture Foundation §8.2).
 */
export function validateEnv(config: Record<string, unknown>): EnvVars {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    // eslint-disable-next-line no-console
    console.error(`\n✖ Invalid environment configuration:\n${formatted}\n`);

    throw new Error('Environment validation failed. See above for details.');
  }

  return result.data;
}
