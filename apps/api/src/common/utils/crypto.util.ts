import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Generic, side-effect-free cryptographic primitives shared across
 * modules — e.g. `auth` hashing a refresh token before storage,
 * `documents` computing a file checksum, `wallet` hashing an idempotency
 * key for a cache lookup.
 *
 * Deliberately does NOT include password hashing (bcrypt) or JWT
 * signing/verification — those decisions belong to the `auth` module
 * (Backend Constitution §30), not to Foundation-level shared utilities.
 */

/** Cryptographically secure random token, hex-encoded. Default 32 bytes (256 bits). */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** SHA-256 hash of the input, hex-encoded. Used for hashing values before storage/lookup — never for passwords. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Constant-time string comparison, to avoid timing side-channels when
 * comparing secrets (e.g. a presented refresh-token hash against the
 * stored one). Returns `false` (not a thrown error) on length mismatch.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
