import { z } from "zod";

/**
 * Validation schemas owned by the `auth` domain module (Arch §3.1).
 *
 * These are the ONLY source of truth for the shape of a registration or
 * login request (Arch §10.3, BE-CON §16/§24): `apps/api`'s
 * `CreateZodDto`-wrapped controller DTOs import these directly, and
 * `apps/web`'s registration/login forms use the same schema as their
 * React Hook Form resolver, so client and server can never disagree on
 * shape (Spec §2.1.4).
 *
 * Scope note: only the fields the `auth` module's own `users` table owns
 * (Arch §3.1 — identity only, no profile/wallet/skill data) are validated
 * here. `displayName`, avatar, bio, etc. belong to the future `profiles`
 * module and are deliberately absent.
 */

/**
 * Shared email/password primitives so `registerSchema` and `loginSchema`
 * apply identical normalization (trim + lowercase the email) without
 * duplicating the rule twice.
 *
 * The password max length of 72 is deliberate, not arbitrary: bcrypt
 * silently truncates any input beyond 72 bytes, so accepting a longer
 * password would mean two different long passwords hash identically —
 * capping the input length here makes that impossible rather than
 * relying on bcrypt's silent behavior (Spec §2.6).
 */
const emailSchema = z.string().trim().toLowerCase().email().max(255);
const newPasswordSchema = z.string().min(8).max(72);

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  /**
   * Deliberately un-narrowed (no `.min(8)`) on login: rejecting a
   * too-short password before attempting the credential check would leak
   * information about password policy to an attacker without adding any
   * real protection — an incorrect password of any length fails the same
   * generic `INVALID_CREDENTIALS` check either way.
   */
  password: z.string().min(1).max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
