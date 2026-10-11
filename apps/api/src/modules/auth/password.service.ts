import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import type { AuthConfig } from '@app/config/configuration';

/**
 * Password hashing/verification, owned by the `auth` module (Backend
 * Constitution §30). bcrypt, cost factor 12 by default (Technology
 * Specification §2.6), configurable via `BCRYPT_SALT_ROUNDS`.
 *
 * Deliberately its own class rather than folded into `AuthService`
 * (Single Responsibility, Backend Constitution §9) — this is the one
 * piece of the module a future security review is most likely to need to
 * read in isolation.
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds: number;

  constructor(configService: ConfigService) {
    this.saltRounds = configService.get<AuthConfig>('auth')!.bcryptSaltRounds;
  }

  async hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, this.saltRounds);
  }

  /**
   * Constant-time-by-construction (bcrypt's own comparison is designed to
   * not leak timing information) verification. Returns `false` for a
   * `null` stored hash (OAuth-only account with no password set, or a
   * nonexistent user — `AuthService` passes `null` for both) rather than
   * throwing — the caller decides what that means, this method only
   * answers "does this plaintext match this hash".
   *
   * CORRECTED during the DEV-02/DB-02/FE-02/BE-02 merge (see
   * docs/architecture/RECONCILIATION-DEV02-DB02-FE02-BE02.md §5): the
   * original version short-circuited with `if (!storedHash) return false`
   * *before* calling `bcrypt.compare`, which meant a login attempt
   * against a nonexistent email or an OAuth-only account returned
   * near-instantly, while a real user with a wrong password paid a full
   * bcrypt cost-12 comparison (~100ms+). `AuthService.login()`'s own
   * comments claim identical failure behaviour for "no such user" and
   * "wrong password" specifically to prevent email enumeration — the
   * *exception thrown* was identical, but the *time taken* to throw it
   * was not, which is itself an enumeration side-channel. Fixed by always
   * running a real `bcrypt.compare` — against `DUMMY_HASH` (a fixed,
   * valid bcrypt hash of an arbitrary string, not tied to any real
   * account) when there is no real hash to compare against — so the
   * null-hash path costs the same as a real one and the result is
   * discarded either way.
   */
  async verify(plaintext: string, storedHash: string | null): Promise<boolean> {
    return bcrypt.compare(plaintext, storedHash ?? PasswordService.DUMMY_HASH);
  }

  /**
   * A fixed, valid bcrypt hash (cost 12) of an arbitrary placeholder
   * string — never a real password, never a real account. Exists solely
   * so `verify()` has something genuine to `bcrypt.compare` against on
   * the "no stored hash" path, keeping that path's timing indistinguishable
   * from a real comparison. Intentionally a constant, not
   * generated per-instance: generating it fresh would cost a real hash
   * operation on every service construction for no benefit, since its
   * value is never meant to match anything.
   */
  private static readonly DUMMY_HASH =
    '$2b$12$PjNV.19S9JNhTOy8HH76eeMywhWpijq2qEZ1qsuZABW4mHvzTHxru';
}
