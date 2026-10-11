import type { ApiEnvelope, ApiError } from "@talentswap/types";

import { env } from "@/lib/env";

/**
 * The ONE configured fetch wrapper for the entire application (FE-CON §50).
 * No component, hook, or module calls `fetch()` directly — every module's
 * `lib/api/<module>.ts` slice (added by that module's own PR) calls
 * `apiRequest` here instead.
 *
 * Responsibilities owned centrally, once, so no module reimplements them:
 *   - base URL + `/api/v1/*` prefixing (Arch §9.7)
 *   - auth header injection (Bearer token, once auth ships — see TODO)
 *   - standard response-envelope parsing (Arch §9.1/§9.2)
 *   - network-vs-API-error distinction (FE-CON §24)
 */

export class ApiRequestError extends Error {
  readonly code: string;
  // Explicit `| undefined` union (not an optional `?` field) — required
  // under `exactOptionalPropertyTypes: true` (Arch §6.1) to assign
  // `error.details`, which may itself be `undefined`, without the
  // assignment being flagged as incompatible with an omitted key.
  readonly details: Record<string, unknown> | undefined;
  readonly status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Unable to reach the server. Check your connection and try again.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

let accessTokenProvider: () => string | null = () => null;

export function configureApiAuth(provider: () => string | null): void {
  accessTokenProvider = provider;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip JSON-encoding the body (e.g. for FormData). */
  raw?: boolean;
}

/**
 * Issues a request against `${NEXT_PUBLIC_API_BASE_URL}${path}` and
 * unwraps the standard success/error envelope (Arch §9.1/§9.2).
 *
 * Auth header injection is intentionally not wired yet — `auth` (FE-01 in
 * the Master Development Plan sense) is out of scope for this foundation
 * module. The single insertion point is marked below so the Auth module
 * adds it here, once, rather than every module reinventing it.
 */
export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> {
  const { body, raw, headers, ...rest } = options;

  // Built as a plain object and the `body` key only ever set when there's
  // an actual value, rather than assigned `undefined` — under
  // `exactOptionalPropertyTypes: true` (Arch §6.1), `RequestInit["body"]`
  // (`BodyInit | null`, no `undefined` in DOM's lib types) rejects an
  // explicit `undefined` even though the key itself is optional. Omitting
  // the key entirely is the only spelling that satisfies both DOM's types
  // and this project's strictness setting.
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(raw ? {} : { "Content-Type": "application/json" }),
      ...(accessTokenProvider() ? { Authorization: `Bearer ${accessTokenProvider()}` } : {}),
      ...headers,
    },
    credentials: "include",
  };

  if (body !== undefined) {
    init.body = raw ? (body as BodyInit) : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, init);
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<TData> | null;

  if (!envelope) {
    throw new NetworkError(new Error(`Malformed response (status ${response.status})`));
  }

  if (!envelope.success) {
    throw new ApiRequestError(response.status, envelope.error);
  }

  return envelope.data;
}

export function apiRequestWithProgress<TData>(
  path: string,
  body: FormData,
  onProgress: (value: number) => void,
): Promise<TData> {
  return new Promise<TData>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${env.NEXT_PUBLIC_API_BASE_URL}${path}`);
    xhr.withCredentials = true;
    const token = accessTokenProvider();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onerror = () => reject(new NetworkError(new Error("Upload failed")));
    xhr.onload = () => {
      try {
        const envelope = JSON.parse(xhr.responseText) as ApiEnvelope<TData>;
        if (envelope.success) resolve(envelope.data);
        else reject(new ApiRequestError(xhr.status, envelope.error));
      } catch (cause) { reject(new NetworkError(cause)); }
    };
    xhr.send(body);
  });
}

/**
 * Translates an error thrown by `apiRequest` into a user-facing message,
 * for use in a TanStack Query `onError` handler (FE-CON §24).
 *
 * Components should switch on `error.code` (a stable identifier) for any
 * error that should change the UI meaningfully — never on `error.message`,
 * which is display text (FE-CON §24).
 */
export function parseApiError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiRequestError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof NetworkError) {
    return { code: "NETWORK_ERROR", message: error.message };
  }
  return { code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." };
}
