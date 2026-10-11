import { utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

/** Fields that must never appear in a log line, redacted centrally. */
const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'refresh_token',
  'authorization',
  'secret',
]);

/**
 * Redacts sensitive fields centrally in the Winston formatter — never left
 * to individual call sites to remember (Architecture Foundation §6.7,
 * Backend Constitution §28: "Secrets, tokens, raw passwords, and full
 * credential-document contents are never logged.").
 */
function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        REDACTED_KEYS.has(key) ? '[REDACTED]' : redact(val, seen),
      ]),
    );
  }

  return value;
}

const redactFormat = winston.format((info) => redact(info) as winston.Logform.TransformableInfo)();

/**
 * Structured JSON logging (Architecture Foundation §6.7, Backend
 * Constitution §28/§29): consumed locally via console in development, and
 * intended to ship to Loki/CloudWatch in staging/production (`INFRA-07`,
 * a DevOps-owned concern this module does not configure).
 *
 * `level` is set at call time from `EnvVars.LOG_LEVEL` in `main.ts` — this
 * factory takes it as a parameter rather than reading `process.env`
 * directly, per Architecture Foundation §8.2.
 */
export function createWinstonConfig(options: {
  level: string;
  nodeEnv: string;
}): winston.LoggerOptions {
  const isProduction = options.nodeEnv === 'production';

  return {
    level: options.level,
    format: isProduction
      ? winston.format.combine(redactFormat, winston.format.timestamp(), winston.format.json())
      : winston.format.combine(
          redactFormat,
          winston.format.timestamp(),
          nestWinstonUtilities.format.nestLike('TalentSwap', {
            colors: true,
            prettyPrint: true,
          }),
        ),
    transports: [new winston.transports.Console()],
  };
}
