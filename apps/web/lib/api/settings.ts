import type { SettingsInput } from "@talentswap/validation"; import { apiRequest } from "@/lib/api";
export const settingsApi={get:()=>apiRequest<Record<string,unknown>>("/settings"),update:(body:SettingsInput)=>apiRequest<Record<string,unknown>>("/settings",{method:"PATCH",body})};
