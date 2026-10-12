"use client";

import { useState } from "react";
import { BarChart3, FileCheck, ShieldAlert, Users } from "lucide-react";
import { Role } from "@talentswap/types";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import { useLiveQuery } from "@/lib/api/query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

export function AdminPage({ section = "overview" }: { section?: "overview" | "users" | "documents" | "analytics" | "transactions" }) {
  const user = useAuthStore(state => state.user);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const enabled = user?.role === Role.ADMIN;
  const metrics = useLiveQuery({ queryKey: ["admin", "analytics", user?.id], queryFn: adminApi.analytics, enabled });
  const users = useLiveQuery({ queryKey: ["admin", "users", user?.id], queryFn: adminApi.users, enabled });
  const documents = useLiveQuery({ queryKey: ["admin", "documents", user?.id], queryFn: adminApi.documents, enabled });
  const flagged = useLiveQuery({ queryKey: ["admin", "flagged", user?.id], queryFn: adminApi.flaggedTransactions, enabled });

  if (!enabled) return <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8"><Alert className="border-destructive/30 text-destructive"><ShieldAlert className="mb-2 size-5"/><strong>Unauthorized</strong><p className="mt-1">Only administrators can access this dashboard. The backend enforces the same restriction.</p></Alert></div>;

  const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
    setBusyId(id); setActionError(""); setActionSuccess("");
    try {
      await action();
      setActionSuccess(successMessage);
      await Promise.all([users.refetch(), documents.refetch(), flagged.refetch(), metrics.refetch()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The administrative action failed.");
    } finally { setBusyId(null); }
  };

  const error = metrics.error || users.error || documents.error || flagged.error;
  const stats = metrics.data;
  return <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
    <div className="mb-6"><h1 className="text-3xl font-semibold">Admin dashboard</h1><p className="text-sm text-muted-foreground">Live administrative data from the TalentSwap API. Demo data is never substituted here.</p></div>
    {error && <Alert className="mb-4 border-destructive/30 text-destructive">Some admin data could not be loaded. Check the API and retry.</Alert>}
    {actionError && <Alert className="mb-4 border-destructive/30 text-destructive">{actionError}</Alert>}
    {actionSuccess && <Alert className="mb-4 border-success/30 text-success">{actionSuccess}</Alert>}
    {section === "overview" || section === "analytics" ? <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Registered users" value={stats?.users} icon={<Users className="size-5"/>}/>
        <Metric label="Total exchanges" value={stats?.transactions} icon={<BarChart3 className="size-5"/>}/>
        <Metric label="Completed exchanges" value={stats?.completed} icon={<FileCheck className="size-5"/>}/>
        <Metric label="Open disputes" value={stats?.disputes} icon={<ShieldAlert className="size-5"/>}/>
      </div>
      {section === "overview" && <Card className="mt-6"><CardHeader><CardTitle>Administrative controls</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Use the Users, Documents and Transactions sections to perform audited moderation and dispute-resolution actions.</CardContent></Card>}
    </> : null}

    {section === "users" && <Card><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="divide-y p-0">{users.isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading users…</p> : (users.data ?? []).map(record => <div key={record.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{record.email.split("@")[0] || "TalentSwap member"}</p><p className="text-xs text-muted-foreground">{record.email}</p><p className="text-xs text-muted-foreground">Joined {new Date(record.createdAt).toLocaleDateString()}</p></div><Badge variant={record.isBanned ? "destructive" : "outline"}>{record.isBanned ? "Banned" : record.role}</Badge><Button size="sm" variant="outline" disabled={busyId === record.id || (record.id === user?.id && !record.isBanned)} onClick={() => void runAction(record.id, () => adminApi.ban(record.id, !record.isBanned), record.isBanned ? "User unbanned." : "User banned.")}>{record.isBanned ? "Unban" : "Ban"}</Button></div>)}{users.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No users returned.</p>}</CardContent></Card>}

    {section === "documents" && <Card><CardHeader><CardTitle>Document review queue</CardTitle></CardHeader><CardContent className="divide-y p-0">{documents.isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading documents…</p> : (documents.data ?? []).map(document => <div key={document.id} className="space-y-3 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{document.originalName || "Uploaded document"}</p><p className="text-xs text-muted-foreground">User {document.userId} · {document.fileType}</p></div><Badge>{document.status.replaceAll("_", " ")}</Badge></div>{document.status === "PENDING_REVIEW" && <><Textarea placeholder="Optional review reason (required for rejection by policy)" value={reasons[document.id] ?? ""} onChange={event => setReasons(current => ({ ...current, [document.id]: event.target.value }))}/><div className="flex gap-2"><Button size="sm" disabled={busyId === document.id} onClick={() => void runAction(document.id, () => adminApi.reviewDocument(document.id, "APPROVED"), "Document approved.")}>Approve</Button><Button size="sm" variant="destructive" disabled={busyId === document.id || (reasons[document.id] ?? "").trim().length < 5} onClick={() => void runAction(document.id, () => adminApi.reviewDocument(document.id, "REJECTED", reasons[document.id].trim()), "Document rejected.")}>Reject</Button></div></>}</div>)}{documents.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No documents returned.</p>}</CardContent></Card>}

    {section === "transactions" && <Card><CardHeader><CardTitle>Disputed transactions</CardTitle></CardHeader><CardContent className="divide-y p-0">{flagged.isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading disputes…</p> : (flagged.data ?? []).map(transaction => <div key={transaction.id} className="space-y-3 p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">Dispute {transaction.id}</p><p className="text-sm text-muted-foreground">Initiator: {transaction.initiatorId}</p><p className="text-sm text-muted-foreground">Provider: {transaction.providerId}</p><p className="text-sm">{transaction.pointsHeld} SkillPoints · {transaction.status}</p>{transaction.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{transaction.notes}</p>}</div><Badge variant="warning">Disputed</Badge></div><Textarea placeholder="Enter the reason for this resolution (at least 10 characters)" value={reasons[transaction.id] ?? ""} onChange={event => setReasons(current => ({ ...current, [transaction.id]: event.target.value }))}/><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busyId === transaction.id || (reasons[transaction.id] ?? "").trim().length < 10} onClick={() => void runAction(transaction.id, () => adminApi.resolveDispute(transaction.id, "REFUND_INITIATOR", reasons[transaction.id].trim()), "Dispute resolved: points refunded to initiator.")}>Refund initiator</Button><Button size="sm" variant="outline" disabled={busyId === transaction.id || (reasons[transaction.id] ?? "").trim().length < 10} onClick={() => void runAction(transaction.id, () => adminApi.resolveDispute(transaction.id, "PAY_PROVIDER", reasons[transaction.id].trim()), "Dispute resolved: points released to provider.")}>Pay provider</Button></div></div>)}{flagged.data?.length === 0 && <p className="p-5 text-sm text-muted-foreground">No disputed transactions.</p>}</CardContent></Card>}
  </div>;
}

function Metric({ label, value, icon }: { label: string; value: number | undefined; icon: React.ReactNode }) {
  return <Card><CardContent className="p-5"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{label}</span>{icon}</div><p className="mt-3 text-3xl font-bold">{value === undefined ? "—" : value.toLocaleString()}</p></CardContent></Card>;
}
