/**
 * @talentswap/types — framework-agnostic TypeScript interfaces, enums, and
 * DTO shapes shared by apps/web and apps/api (Arch §2.3).
 *
 * This is the ONLY legal way apps/web and apps/api agree on a data shape
 * (Arch §3.1). Only what is re-exported here is part of the package's
 * public surface (Arch §6.5).
 *
 * Domain type files (user.types.ts, skill.types.ts, transaction.types.ts,
 * wallet.types.ts, chat.types.ts, notification.types.ts,
 * gamification.types.ts, …) are added by each domain's own BE-xx/FE-xx
 * module in its own PR, per Arch §17.2 step 3 — this foundation module
 * (FE-01) intentionally shipped none of them. `auth.types.ts` is the
 * first domain file, added by BE-02 (Authentication Foundation).
 */

export * from "./api-envelope.types";
export * from "./auth.types";

export * from "./domain.types";
