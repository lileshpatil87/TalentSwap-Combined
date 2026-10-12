"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Compass, LoaderCircle, SlidersHorizontal, Star, Verified } from "lucide-react";
import { discoverApi } from "@/lib/api/discover";
import { transactionsApi } from "@/lib/api/transactions";
import { useAuthStore } from "@/store/authStore";
import { useLiveQuery } from "@/lib/api/query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
export function DiscoverPage() {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("All"); const [min, setMin] = useState(0);
  const user = useAuthStore(state => state.user);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestStates, setRequestStates] = useState<Record<string, {kind:"success"|"error"; message:string}>>({});
  const categories = useLiveQuery({ queryKey: ["skill-categories"], queryFn: discoverApi.categories });
  const encoded = new URLSearchParams(); if (query.trim().length >= 1) encoded.set("q", query.trim()); if (category !== "All") encoded.set("categoryId", category); encoded.set("page", "1"); encoded.set("limit", "50");
  const matches = useLiveQuery({ queryKey: ["discover", query, category], queryFn: () => discoverApi.list(`?${encoded.toString()}`) });
  const visible = useMemo(() => (matches.data ?? []).filter(m => m.matchScore >= min && `${m.user.name} ${m.offeredSkill.title} ${m.wantedSkill}`.toLowerCase().includes(query.toLowerCase())), [matches.data, query, min]);
  const requestExchange = async (match: (typeof visible)[number]) => {
    if (!user) {
      setRequestStates(s => ({ ...s, [match.id]: { kind: "error", message: "Sign in before requesting an exchange." } }));
      return;
    }
    if (match.user.id === user.id) {
      setRequestStates(s => ({ ...s, [match.id]: { kind: "error", message: "You cannot request an exchange with your own profile." } }));
      return;
    }
    setRequesting(match.id);
    setRequestStates(s => { const next={...s}; delete next[match.id]; return next; });
    try {
      await transactionsApi.create({
        providerId: match.user.id,
        skillId: match.offeredSkill.id,
        type: "TWO_WAY",
        pointsHeld: match.offeredSkill.pointsPerHour,
        idempotencyKey: crypto.randomUUID(),
        notes: `Exchange request for ${match.offeredSkill.title}`,
      });
      setRequestStates(s => ({ ...s, [match.id]: { kind: "success", message: "Request sent. You can follow its status in Exchanges." } }));
    } catch (error) {
      setRequestStates(s => ({ ...s, [match.id]: { kind: "error", message: error instanceof Error ? error.message : "The request could not be sent. Please try again." } }));
    } finally { setRequesting(null); }
  };
  return <div className="mx-auto max-w-7xl px-4 py-7 lg:px-8 ts-page-enter">
    <section className="ts-page-hero mb-7 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p className="ts-eyebrow flex items-center gap-2"><Compass className="size-4"/> Curated for your next skill</p><h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Find someone who knows what you want to learn.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Discover real members, compare what they offer, and send an exchange request when it feels like a fit.</p></div>
      <div className="rounded-2xl border border-border/70 bg-background/70 p-4"><p className="text-xs text-muted-foreground">People in your discovery list</p><p className="mt-1 text-3xl font-bold">{matches.data?.length ?? "—"}</p><p className="text-xs text-muted-foreground">Based on your profile and skills</p></div>
    </section>
    {matches.error&&!matches.fallbackUsed&&<Alert className="mb-4">Matching suggestions could not be loaded from the server. Check that the API is running and retry.</Alert>}
    <section className="mb-6 rounded-2xl border border-border/80 bg-background/75 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4 text-primary"/> Refine your search</div>
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_200px_180px_auto]"><Input aria-label="Search people or skills" placeholder="Try design, Java, photography…" value={query} onChange={e => setQuery(e.target.value)}/><Select value={category} onChange={e => setCategory(e.target.value)}><option value="All">All categories</option>{(categories.data ?? []).map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</Select><Select value={String(min)} onChange={e => setMin(Number(e.target.value))}><option value="0">Any match score</option><option value="80">80% and above</option><option value="90">90% and above</option></Select><Button variant="outline" onClick={() => { setQuery(""); setCategory("All"); setMin(0); }}>Reset filters</Button></div>
    </section>
    <div className="mb-4 flex items-end justify-between gap-3"><div><p className="ts-eyebrow">Your potential matches</p><h2 className="mt-1 text-xl font-bold">Members to learn with</h2></div><p className="text-sm text-muted-foreground">{visible.length} {visible.length===1?"person":"people"}</p></div>
    {matches.isLoading ? <div role="status" className="rounded-2xl border border-border bg-background/70 p-10 text-center text-sm text-muted-foreground">Finding relevant members…</div> : visible.length === 0 ? <Card><CardContent className="p-12 text-center"><Compass className="mx-auto size-8 text-primary"/><h3 className="mt-3 font-semibold">No matches yet</h3><p className="mt-1 text-sm text-muted-foreground">Try a different keyword or reset your filters.</p></CardContent></Card> : <div className="grid gap-5 lg:grid-cols-2">{visible.map(m => {
      const state = requestStates[m.id];
      return <Card key={m.id} className="ts-surface overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6"><div className="flex min-w-0 gap-3"><div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">{m.user.name.split(/\\s+/).map(n=>n[0]).slice(0,2).join("").toUpperCase()}</div><div className="min-w-0"><Link href={`/users/${m.user.id}`} className="font-bold hover:text-primary">{m.user.name}</Link><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.user.headline || "TalentSwap community member"}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="size-3 fill-current text-warning"/>{m.user.rating.toFixed(1)} · {m.user.reviewCount} reviews</span>{m.user.verified && <Badge variant="success"><Verified className="mr-1 size-3"/>Verified</Badge>}</div></div></div><div className="shrink-0 rounded-2xl bg-success/10 px-3 py-2 text-center text-success"><p className="text-xl font-bold">{m.matchScore}%</p><p className="text-[10px] font-semibold uppercase tracking-wide">Match</p></div></div>
          <div className="mx-5 grid gap-3 rounded-xl bg-muted/55 p-4 sm:mx-6 sm:grid-cols-2"><div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Can teach you</p><p className="mt-1 font-semibold">{m.offeredSkill.title}</p><p className="mt-1 text-xs text-muted-foreground">{m.offeredSkill.level.toLowerCase()} · {m.offeredSkill.pointsPerHour} points / hour</p></div><div><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Wants to learn</p><p className="mt-1 font-semibold">{m.wantedSkill}</p><p className="mt-1 text-xs text-muted-foreground">A chance to exchange skills</p></div></div>
          <p className="px-5 pt-3 text-sm leading-5 text-muted-foreground sm:px-6">{m.reason}</p>
          {state && <div role="status" className={`mx-5 mt-3 rounded-lg px-3 py-2 text-sm sm:mx-6 ${state.kind==="success"?"bg-success/10 text-success":"bg-destructive/10 text-destructive"}`}>{state.message}</div>}
          <div className="mt-4 flex items-center justify-between border-t border-border/70 px-5 py-4 sm:px-6"><Link href={`/users/${m.user.id}`} className="text-sm font-semibold text-primary hover:underline">View profile</Link><Button size="sm" disabled={requesting===m.id || Boolean(state?.kind==="success")} onClick={() => void requestExchange(m)}>{requesting===m.id?<><LoaderCircle className="size-4 animate-spin"/>Sending…</>:state?.kind==="success"?<><CheckCircle2 className="size-4"/>Request sent</>:<>Request exchange <ArrowUpRight className="size-4"/></>}</Button></div>
        </CardContent>
      </Card>;
    })}</div>}
  </div>;
}
