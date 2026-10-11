import type { DocumentItem } from "@talentswap/types";
import { apiRequest, apiRequestWithProgress } from "@/lib/api";
export const documentsApi={list:()=>apiRequest<DocumentItem[]>("/documents"),upload:(body:FormData)=>apiRequest<DocumentItem>("/documents",{method:"POST",body,raw:true}),uploadWithProgress:(body:FormData,onProgress:(value:number)=>void)=>apiRequestWithProgress<DocumentItem>("/documents",body,onProgress)};
