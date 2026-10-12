import type { LedgerEntry, WalletSnapshot } from "@talentswap/types";
import { apiRequest } from "@/lib/api";

type LedgerRecord = { id: string; createdAt: string; entryType: string; amount: number; description: string; transactionId?: string | null };
type LedgerPage = { items: LedgerRecord[]; total: number; page: number; limit: number; totalPages: number };

export const walletApi = {
  balance: () => apiRequest<WalletSnapshot>("/wallet/balance"),
  ledger: async (query = ""): Promise<LedgerEntry[]> => {
    const page = await apiRequest<LedgerPage>(`/wallet/ledger${query}`);
    return page.items.map((entry) => ({
      id: entry.id, createdAt: entry.createdAt,
      type: entry.entryType === "CREDIT" || entry.entryType === "ADMIN_ADJUSTMENT" ? "CREDIT" : entry.entryType === "DEBIT" ? "DEBIT" : entry.entryType === "ESCROW_HOLD" ? "HOLD" : "RELEASE",
      amount: entry.amount, description: entry.description, ...(entry.transactionId ? { reference: entry.transactionId } : {}),
    }));
  },
};
