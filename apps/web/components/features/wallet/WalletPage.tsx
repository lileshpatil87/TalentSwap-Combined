"use client";
import { useState } from "react";
import { RefreshCw, WalletCards, ArrowDownLeft, ArrowUpRight, LockKeyhole, Sparkles, TrendingUp, CircleAlert } from "lucide-react";
import { walletApi } from "@/lib/api/wallet";
import { useLiveQuery } from "@/lib/api/query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useAuthStore } from "@/store/authStore";

export function WalletPage() {
  const user = useAuthStore(s => s.user);
  const [refreshedAt, setRefreshedAt] = useState("");
  const balance = useLiveQuery({ queryKey: ["wallet", "balance", user?.id], queryFn: walletApi.balance, enabled: Boolean(user) });
  const ledger = useLiveQuery({ queryKey: ["wallet", "ledger", user?.id], queryFn: () => walletApi.ledger(), enabled: Boolean(user) });
  const wallet = balance.data;
  const walletError = balance.error ?? ledger.error;
  const walletErrorMessage = walletError instanceof Error ? walletError.message : "Retry the request and check the API terminal if this continues.";
  const refresh = async () => {
    await Promise.allSettled([balance.refetch(), ledger.refetch()]);
    setRefreshedAt(new Date().toLocaleTimeString());
  };
  return <div className="mx-auto max-w-7xl px-4 py-7 lg:px-8 ts-page-enter">
    <section className="ts-page-hero mb-7 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p className="ts-eyebrow flex items-center gap-2"><WalletCards className="size-4"/> Your SkillPoints</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A clearer view of your learning currency.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Track your available points, what is held for exchanges, and every confirmed movement in your ledger.</p></div>
      <Button variant="outline" onClick={() => void refresh()} disabled={balance.isFetching || ledger.isFetching}><RefreshCw className={`size-4 ${balance.isFetching||ledger.isFetching?"animate-spin":""}`}/>Refresh balance</Button>
    </section>
    {(balance.error || ledger.error) && <Alert className="mb-5"><CircleAlert className="size-4"/><div><p className="font-semibold">{balance.error ? "Your balance could not be verified." : "Your balance loaded, but the ledger could not be loaded."}</p><p className="mt-1 text-sm">{walletErrorMessage} Any unavailable values are not confirmed account values.</p></div></Alert>}
    <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr_1fr]">
      <Card className="ts-surface ts-stat-card overflow-hidden border-0 bg-primary text-primary-foreground lg:row-span-2"><CardContent className="relative flex h-full min-h-64 flex-col justify-between p-6 sm:p-8"><div><div className="flex items-center gap-2 text-sm font-semibold text-primary-foreground/80"><Sparkles className="size-4"/> Total balance</div><p className="mt-5 text-5xl font-bold tracking-tight">{wallet ? wallet.balance.toLocaleString() : "—"}</p><p className="mt-2 text-sm text-primary-foreground/80">{wallet?.currencyLabel ?? "Skill Points"}</p></div><div className="mt-8 flex items-center gap-2 text-xs text-primary-foreground/80"><LockKeyhole className="size-4"/> Verified by the server ledger</div></CardContent></Card>
      <Card className="ts-surface ts-stat-card"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Available to use</p><span className="rounded-xl bg-success/10 p-2 text-success"><ArrowUpRight className="size-4"/></span></div><p className="mt-4 text-3xl font-bold">{wallet ? wallet.available.toLocaleString() : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Ready for your next exchange</p></CardContent></Card>
      <Card className="ts-surface ts-stat-card"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Held in exchanges</p><span className="rounded-xl bg-warning/15 p-2 text-warning"><LockKeyhole className="size-4"/></span></div><p className="mt-4 text-3xl font-bold">{wallet ? wallet.pending.toLocaleString() : "—"}</p><p className="mt-1 text-xs text-muted-foreground">Released when eligible exchanges settle</p></CardContent></Card>
      <Card className="ts-surface lg:col-span-2"><CardContent className="flex items-start gap-4 p-5"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><TrendingUp className="size-5"/></span><div><h2 className="font-bold">Keep your learning moving</h2><p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">SkillPoints are held and released by the exchange workflow. Your browser never calculates the authoritative balance or changes ledger entries.</p>{refreshedAt&&<p className="mt-2 text-xs text-muted-foreground">Last refreshed at {refreshedAt}</p>}</div></CardContent></Card>
    </div>
    <Card className="ts-surface mt-7 overflow-hidden"><CardHeader className="border-b border-border/70 bg-muted/30 px-5 py-5 sm:px-6"><div className="flex items-center justify-between gap-3"><div><p className="ts-eyebrow">Account activity</p><CardTitle className="mt-1 text-xl">Wallet ledger</CardTitle></div><Badge variant="outline">{ledger.data?.length ?? 0} entries</Badge></div></CardHeader><CardContent className="p-0">
      {ledger.isLoading ? <div role="status" className="p-8 text-sm text-muted-foreground">Loading confirmed ledger entries…</div> : ledger.data?.length ? <div className="divide-y divide-border/70">{ledger.data.map(e=><div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"><div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${e.type==="CREDIT"?"bg-success/10 text-success":e.type==="DEBIT"?"bg-destructive/10 text-destructive":"bg-warning/15 text-warning"}`}>{e.type==="CREDIT"?<ArrowDownLeft className="size-5"/>:e.type==="DEBIT"?<ArrowUpRight className="size-5"/>:<LockKeyhole className="size-5"/>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{e.description}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}{e.reference?` · Ref ${e.reference}`:""}</p></div><Badge variant={e.type==="CREDIT"?"success":e.type==="HOLD"?"warning":"outline"}>{e.type}</Badge><span className={`min-w-20 text-right font-bold tabular-nums ${e.type==="CREDIT"?"text-success":e.type==="DEBIT"?"text-destructive":""}`}>{e.type==="CREDIT"?"+":e.type==="DEBIT"?"−":"−"}{e.amount}</span></div>)}</div> : <div className="px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted"><WalletCards className="size-5 text-muted-foreground"/></div><h3 className="mt-3 font-semibold">{ledger.error ? "Ledger temporarily unavailable" : "Your wallet activity will appear here"}</h3><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{ledger.error ? "Your current balance may still be available. Check the API terminal for the ledger request error, then refresh." : "When points are credited, held or released, the confirmed entry will be listed here."}</p><Button className="mt-4" variant="outline" onClick={() => void refresh()}>Try again</Button></div>}
    </CardContent></Card>
  </div>;
}
