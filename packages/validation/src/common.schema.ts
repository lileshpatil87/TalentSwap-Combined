import { z } from "zod";

/**
 * Cross-cutting validation primitives with no single domain owner.
 * Domain schemas (auth.schema.ts, skill.schema.ts, transaction.schema.ts,
 * profile.schema.ts, community.schema.ts, …) are added by each domain's
 * own BE-xx/FE-xx module per Arch §17.2 step 3 — not shipped here.
 */

/** Standard UUID v4 identifier, used as a path/query param shape. */
export const uuidSchema = z.string().uuid();

/** Offset pagination query params — `?page=1&limit=20` (Arch §9.3). */
export const offsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Cursor pagination query params — `?cursor=<opaque>&limit=20` (Arch §9.3). */
export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationQuerySchema>;
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
