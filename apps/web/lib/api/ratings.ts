import type { Rating } from "@talentswap/types"; import type { RatingInput } from "@talentswap/validation"; import { apiRequest } from "@/lib/api";
export interface RatingCreateInput extends RatingInput { exchangeId: string }
export const ratingsApi={list:(id:string)=>apiRequest<Rating[]>(`/ratings/user/${id}`),create:(body:RatingCreateInput)=>apiRequest<Rating>("/ratings",{method:"POST",body})};
