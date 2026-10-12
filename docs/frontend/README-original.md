# TalentSwap Frontend — FE-03 → FE-20

Complete cumulative frontend track for TalentSwap, following the frozen FE-03 → FE-20 order from the authoritative prompt PDF.

## Stack

- Next.js 14 App Router + React 18 + TypeScript
- Tailwind CSS + code-owned UI primitives
- Zustand for client/session/UI state
- TanStack Query for server state
- Zod + React Hook Form-compatible validation contracts
- Socket.io client for chat/notifications/calling signalling
- Browser WebRTC media APIs for calling
- PWA manifest + service worker + install prompt

## API architecture

All REST traffic goes through `apps/web/lib/api.ts`. Feature-specific files under `apps/web/lib/api/` own typed endpoint contracts. Feature pages consume those boundaries through TanStack Query or approved mutations.

Access tokens are memory-only. The refresh-token strategy remains cookie-based at the backend boundary; no authentication token is written to localStorage/sessionStorage.

## Runnable frontend-only mode

The frontend attempts live API calls first. Demo fallback is disabled by default and may be enabled only for non-production public/read-only surfaces. Authenticated account pages never replace real account data with demo data.

For production/staging, set:

```text
NEXT_PUBLIC_DEMO_FALLBACK=false
```

## Development

```bash
pnpm install
pnpm dev
```

Default API endpoints are:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Validation

Dependency-independent source validation:

```bash
pnpm test:source
```

This validates the frozen module sequence, route coverage, TypeScript/TSX transpilation, PWA artifacts, API-boundary adoption, realtime/calling contracts, forbidden artifacts, and packaging constraints.

When dependencies are installed, run the full project validation:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:source
```

See `docs/frontend/FE-03-to-FE-20-execution-matrix.md` for the module-by-module acceptance record.
