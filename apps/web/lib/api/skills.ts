import type { Skill } from "@talentswap/types";
import type { SkillInput } from "@talentswap/validation";
import { apiRequest } from "@/lib/api";

export interface SkillCategory {
  id: number;
  name: string;
}

type ApiSkill = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category?: { id: number; name: string } | null;
  proficiency: Skill["level"];
  pointRate: number;
  isActive: boolean;
  user?: { profile?: { displayName?: string | null } | null };
};

type ApiSkillPage = {
  items: ApiSkill[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function fromApi(skill: ApiSkill): Skill {
  return {
    id: skill.id,
    userId: skill.userId,
    userName: skill.user?.profile?.displayName ?? "TalentSwap member",
    title: skill.title,
    category: skill.category?.name ?? "Uncategorized",
    description: skill.description,
    level: skill.proficiency,
    pointsPerHour: skill.pointRate,
    // Tags are not persisted by the current API schema.
    tags: [],
    active: skill.isActive,
  };
}

function toApi(body: SkillInput, categoryId: number) {
  return {
    title: body.title,
    description: body.description,
    categoryId,
    proficiency: body.level,
    type: "OFFERING" as const,
    pointRate: body.pointsPerHour,
  };
}

export const skillsApi = {
  list: async (query = ""): Promise<Skill[]> => {
    const page = await apiRequest<ApiSkillPage>(`/skills${query}`);
    return page.items.map(fromApi);
  },
  categories: () => apiRequest<SkillCategory[]>("/skills/categories"),
  create: async (body: SkillInput, categoryId: number): Promise<Skill> =>
    fromApi(await apiRequest<ApiSkill>("/skills", { method: "POST", body: toApi(body, categoryId) })),
  update: async (id: string, body: SkillInput, categoryId: number): Promise<Skill> =>
    fromApi(await apiRequest<ApiSkill>(`/skills/${encodeURIComponent(id)}`, { method: "PATCH", body: toApi(body, categoryId) })),
  remove: (id: string) => apiRequest<void>(`/skills/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
