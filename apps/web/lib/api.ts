import type { ApiEnvelope, ApiError, AuthSessionResponse } from "@talentswap/types";

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
let accessTokenUpdater: (session: AuthSessionResponse) => void = () => undefined;
let unauthorizedHandler: () => void = () => undefined;
let refreshInFlight: Promise<string | null> | null = null;

export function configureApiAuth(
  provider: () => string | null,
  updateSession?: (session: AuthSessionResponse) => void,
  onUnauthorized?: () => void,
): void {
  accessTokenProvider = provider;
  accessTokenUpdater = updateSession ?? (() => undefined);
  unauthorizedHandler = onUnauthorized ?? (() => undefined);
}

function isAuthEndpoint(path: string): boolean {
  return /^\/auth\/(login|register|refresh|logout|forgot-password|reset-password)(?:$|\?)/.test(path);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    let response: Response;
    try {
      response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      // A network outage must not erase a session that may still be valid.
      return null;
    }

    const envelope = await response.json().catch(() => null) as ApiEnvelope<AuthSessionResponse> | null;
    if (!response.ok || !envelope?.success || !envelope.data?.accessToken || !envelope.data.user) {
      if (response.status === 401 || response.status === 403) unauthorizedHandler();
      return null;
    }

    accessTokenUpdater(envelope.data);
    return envelope.data.accessToken;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
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
 * Authentication is wired centrally: the current access token is injected,
 * and one refresh attempt is made after an eligible 401 response. Feature
 * modules must never implement their own fetch/auth refresh logic.
 */
export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> {
  return executeApiRequest<TData>(path, options, true);
}

async function executeApiRequest<TData>(
  path: string,
  options: ApiRequestOptions,
  allowRefresh: boolean,
): Promise<TData> {
  const { body, raw, headers, ...rest } = options;
  const token = accessTokenProvider();
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(raw ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  };

  if (body !== undefined) init.body = raw ? (body as BodyInit) : JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, init);
  } catch (cause) {
    throw new NetworkError(cause);
  }

  // Refresh once on expired access tokens. Auth endpoints are excluded to
  // avoid recursive refresh attempts during login/register/refresh/logout.
  if (response.status === 401 && allowRefresh && token && !isAuthEndpoint(path)) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) return executeApiRequest<TData>(path, options, false);
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<TData> | null;
  if (!envelope) throw new NetworkError(new Error(`Malformed response (status ${response.status})`));
  if (!envelope.success) throw new ApiRequestError(response.status, envelope.error);
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
