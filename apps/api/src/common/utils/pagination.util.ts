import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/app.constants';
import type { CursorPaginationMeta, OffsetPaginationMeta } from '../types/pagination.types';

/**
 * Clamps and defaults raw `?page`/`?limit` query values (Architecture
 * Foundation §9.3). Each endpoint's `<Resource>QueryDto` (Zod, per
 * Backend Constitution §16) is responsible for type-coercing the raw
 * query strings to numbers before this runs — this helper only applies
 * the shared bounds, so every module clamps identically.
 */
export function parseOffsetPagination(input: { page?: number; limit?: number }): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  return { page, limit, skip: (page - 1) * limit };
}

export function buildOffsetMeta(page: number, limit: number, total: number): OffsetPaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

export function buildCursorMeta(nextCursor: string | null, hasMore: boolean): CursorPaginationMeta {
  return { nextCursor, hasMore };
}
