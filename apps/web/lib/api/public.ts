import type { MatchSuggestion, Profile } from "@talentswap/types";
import { apiRequest } from "@/lib/api";

export interface PublicSkillRecord {
  id: string; userId: string; title: string; description: string; category?: { name?: string } | null;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"; pointRate: number; isActive: boolean; type: "OFFERING" | "SEEKING";
  user?: {
    id?: string;
    role?: string;
    profile?: {
      displayName?: string | null;
      headline?: string | null;
      location?: string | null;
      avatarUrl?: string | null;
      reputationScore?: number;
      totalExchanges?: number;
      isVerified?: boolean;
    } | null;
  } | null;
}
export interface PaginatedSkills { items: PublicSkillRecord[]; total: number; page: number; limit: number; totalPages: number; }

export const publicApi = {
  skills: (query = "") => apiRequest<PaginatedSkills>(`/skills${query}`),
  categories: () => apiRequest<Array<{ id: number; name: string }>>("/skills/categories"),
  profile: (id: string) => apiRequest<Profile>(`/profiles/${encodeURIComponent(id)}`),
  matches: () => apiRequest<MatchSuggestion[]>("/matches/suggestions"),
};
