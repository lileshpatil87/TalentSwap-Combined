import type { Exchange } from "@talentswap/types";
import { apiRequest } from "@/lib/api";

type ExchangePage = { items: Exchange[]; total: number; page: number; limit: number; totalPages: number };
export interface CreateExchangeInput {
  providerId: string;
  skillId: string;
  type: "ONE_WAY" | "TWO_WAY";
  pointsHeld: number;
  idempotencyKey: string;
  notes?: string;
}
export const transactionsApi = {
  create: (input: CreateExchangeInput) => apiRequest<Exchange>("/transactions", { method: "POST", body: input }),
  list: async (query = ""): Promise<Exchange[]> => {
    const result = await apiRequest<ExchangePage>(`/transactions/history${query}`);
    return result.items;
  },
  get: (id: string) => apiRequest<Exchange>(`/transactions/${encodeURIComponent(id)}`),
};
