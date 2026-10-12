import Link from "next/link";
import { publicApi } from "@/lib/api/public";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
export const dynamic = "force-dynamic";

export default async function PublicSkillsPage() {
  let skills: Awaited<ReturnType<typeof publicApi.skills>>["items"] = [];
  let categories: Awaited<ReturnType<typeof publicApi.categories>> = [];
  let unavailable = false;
  try {
    const results = await Promise.all([publicApi.skills("?type=OFFERING&limit=100"), publicApi.categories()]);
    skills = results[0].items; categories = results[1];
  } catch { unavailable = true; }
  return <PageContainer>
    {unavailable && <div className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm">Live skill data is currently unavailable. No example user profiles are being shown.</div>}
    <PageHeader title="Explore skills" description="Browse real skill listings and find a partner for your next exchange."/>
    <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]"><Input placeholder="Search skills, topics or people" aria-label="Search skills"/><select className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Category"><option value="">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
    {skills.length === 0 ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">{unavailable ? "Try again when the API is available." : "No public skills have been listed yet."}</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{skills.map(skill => { const owner = skill.user?.profile; const ownerName = owner?.displayName || "TalentSwap member"; return <Card key={skill.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Link href={`/users/${skill.userId}`} className="font-semibold hover:text-primary">{ownerName}</Link><p className="mt-1 text-sm text-muted-foreground">{skill.category?.name ?? "Uncategorized"} · {skill.proficiency.toLowerCase()}</p></div><Badge variant="secondary">{skill.pointRate} SP/hr</Badge></div><h2 className="mt-4 text-lg font-semibold">{skill.title}</h2><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{skill.description}</p>{owner?.isVerified && <div className="mt-4"><Badge>Verified member</Badge></div>}</CardContent></Card>; })}</div>}
  </PageContainer>;
}
