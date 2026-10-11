import type { MatchSuggestion } from "@talentswap/types"; import { apiRequest } from "@/lib/api"; export const discoverApi={list:(query="")=>apiRequest<MatchSuggestion[]>(`/discover${query}`)};
