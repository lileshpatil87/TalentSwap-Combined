/**
 * Pure pagination helpers shared by apps/web and apps/api, matching the
 * two pagination styles defined in Architecture Foundation §9.3.
 */

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function toOffsetMeta(
  page: number,
  limit: number,
  total: number,
): PaginatedResult<never>["meta"] {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function toSkipTake(page: number, limit: number): { skip: number; take: number } {
  return {
    skip: Math.max(0, page - 1) * limit,
    take: limit,
  };
}
