/**
 * @talentswap/validation — Zod schemas, the single source of truth for
 * validation, used client-side (React Hook Form resolvers) and
 * server-side (NestJS ZodValidationPipe) — Arch §2.3.
 *
 * Domain schema files are added by each domain's own module in its own
 * PR (FE-CON §23) — this foundation module shipped only cross-cutting
 * primitives with no single domain owner. `auth.schema.ts` is the first
 * domain file, added by BE-02 (Authentication Foundation).
 */

export * from "./common.schema";
export * from "./auth.schema";

export * from "./domain.schema";
