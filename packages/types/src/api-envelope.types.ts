/**
 * Standard REST response envelope shared by apps/web and apps/api.
 *
 * Every response from the TalentSwap API — success or failure — uses one
 * of these two shapes, per Architecture Foundation §9.1/§9.2. This is the
 * ONLY place this shape is defined; neither app may redeclare it locally.
 */

export interface ApiSuccessEnvelope<TData> {
  success: true;
  data: TData;
  meta: ApiResponseMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiError;
  meta: ApiResponseMeta;
}

export type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;

export interface ApiResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: OffsetPaginationMeta | CursorPaginationMeta;
}

export interface ApiError {
  /** Stable, machine-readable UPPER_SNAKE_CASE code (Arch §9.2). */
  code: string;
  /** Safe to render to the user as-is. */
  message: string;
  /** Optional structured detail — never a free-text stack trace. */
  details?: Record<string, unknown>;
}

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

export function isApiSuccess<TData>(
  envelope: ApiEnvelope<TData>,
): envelope is ApiSuccessEnvelope<TData> {
  return envelope.success === true;
}
