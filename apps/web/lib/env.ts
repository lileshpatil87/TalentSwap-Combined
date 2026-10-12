import { z } from "zod";

/**
 * Validated environment configuration for apps/web.
 *
 * Per Architecture Foundation §8.2 and Frontend Constitution §49:
 *   - Only NEXT_PUBLIC_* variables are readable from client-side code.
 *   - This is the ONLY file that reads `process.env` directly — every
 *     other file in the app imports `env` from here.
 *   - Validation fails fast (throws at module-evaluation time) rather
 *     than failing later on first use of a malformed/missing value.
 *
 * A new NEXT_PUBLIC_ variable is added only when the value is genuinely
 * safe to ship to every browser on the internet (Arch §13 rule 1) — never
 * a secret, regardless of justification.
 */

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
  NEXT_PUBLIC_SOCKET_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_DEMO_FALLBACK: z.enum(["true", "false"]).default("false"),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_DEMO_FALLBACK: process.env.NEXT_PUBLIC_DEMO_FALLBACK,
  });

  if (!parsed.success) {
    // Fail fast at boot, not on first request (Arch §8.2).
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error(
      "Invalid environment configuration. Check apps/web/.env.local against .env.example.",
    );
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
