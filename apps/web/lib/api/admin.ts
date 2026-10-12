import { apiRequest } from "@/lib/api";

export interface AdminUserRecord {
  id: string;
  email: string;
  role: "USER" | "VERIFIED_USER" | "MODERATOR" | "ADMIN";
  isEmailVerified: boolean;
  isBanned: boolean;
  createdAt: string;
}

export interface AdminDocumentRecord {
  id: string;
  userId: string;
  originalName: string;
  fileType: string;
  status: string;
  createdAt: string;
}

export interface AdminFlaggedTransaction {
  id: string;
  initiatorId: string;
  providerId: string;
  pointsHeld: number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface AdminDashboardStats {
  users: number;
  transactions: number;
  completed: number;
  disputes: number;
}

export const adminApi = {
  users: () => apiRequest<AdminUserRecord[]>("/admin/users"),
  ban: (id: string, banned = true) => apiRequest<AdminUserRecord>(`/admin/users/${encodeURIComponent(id)}/ban`, {
    method: "PATCH",
    body: { banned },
  }),
  documents: () => apiRequest<AdminDocumentRecord[]>("/admin/documents/queue"),
  reviewDocument: (id: string, status: "APPROVED" | "REJECTED", reason?: string) => apiRequest<AdminDocumentRecord>(`/admin/documents/${encodeURIComponent(id)}/review`, { method: "PATCH", body: { status, ...(reason ? { reason } : {}) } }),
  flaggedTransactions: () => apiRequest<AdminFlaggedTransaction[]>("/admin/transactions/flagged"),
  resolveDispute: (id: string, outcome: "REFUND_INITIATOR" | "PAY_PROVIDER", reason: string) =>
    apiRequest<AdminFlaggedTransaction>(`/admin/transactions/${encodeURIComponent(id)}/resolve-dispute`, {
      method: "PATCH",
      body: { outcome, reason },
    }),
  analytics: () => apiRequest<AdminDashboardStats>("/admin/analytics/dashboard"),
};
