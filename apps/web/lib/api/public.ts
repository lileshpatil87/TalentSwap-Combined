import type { MatchSuggestion, Profile, Skill } from "@talentswap/types";
import { apiRequest } from "@/lib/api";
export const publicApi = {
  skills: (query = "") => apiRequest<Skill[]>(`/skills${query}`),
  profile: (id: string) => apiRequest<Profile>(`/users/${id}`),
  matches: () => apiRequest<MatchSuggestion[]>("/discover"),
};
