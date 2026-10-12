import type { MatchSuggestion } from '@talentswap/types';
import { apiRequest } from '@/lib/api';
type MatchPage = { items: MatchSuggestion[]; page: number; limit: number; total: number; totalPages: number };
export interface SkillCategoryOption { id: number; name: string; slug: string; }
export const discoverApi = {
  list: async (query = ''): Promise<MatchSuggestion[]> => {
    const result = await apiRequest<MatchPage>(`/matches/suggestions${query}`);
    return result.items;
  },
  categories: () => apiRequest<SkillCategoryOption[]>('/skills/categories'),
};
