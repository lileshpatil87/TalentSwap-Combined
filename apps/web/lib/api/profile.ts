import type { Profile } from "@talentswap/types"; import type { ProfileInput } from "@talentswap/validation"; import { apiRequest } from "@/lib/api";
export const profileApi={get:(id:string)=>apiRequest<Profile>(`/users/${id}`),update:(id:string,body:ProfileInput)=>apiRequest<Profile>(`/users/${id}`,{method:"PATCH",body})};
