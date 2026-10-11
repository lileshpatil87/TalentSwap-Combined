/**
 * Shared pagination shapes, matching the two styles fixed by Architecture
 * Foundation §9.3: offset pagination (admin tables, arbitrary page jumps)
 * and cursor pagination (infinite-scroll feeds under concurrent inserts).
 * A single endpoint uses exactly one style — never both.
 */

export interface OffsetPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  pagination: OffsetPaginationMeta;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: CursorPaginationMeta;
}
