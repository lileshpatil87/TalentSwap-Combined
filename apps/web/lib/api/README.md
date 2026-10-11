# `lib/api/` — per-module API client slices

Per Frontend Constitution §50, each domain module wraps its own REST
surface in a thin slice here: `lib/api/<module>.ts` — plain functions
calling the shared `apiRequest()` client from `lib/api.ts` against that
module's `/api/v1/*` endpoints, typed using `@talentswap/types`.

This foundation module (FE-01) intentionally ships no slices — `auth.ts`,
`skills.ts`, `transactions.ts`, `wallet.ts`, `chat.ts`, `community.ts`,
`admin.ts`, etc. are each added by their own domain module's PR (Master
Development Plan §3.1, `FE-xx` "Standard Outputs"), once that module's
corresponding `BE-xx` is `Approved`.

Example shape a future module adds (illustrative only — not implemented
here):

```ts
// lib/api/skills.ts
import { apiRequest } from "@/lib/api";
import type { Skill } from "@talentswap/types";

export function getSkills(query: string) {
  return apiRequest<Skill[]>(`/skills?search=${encodeURIComponent(query)}`);
}
```
