import { notFound } from "next/navigation";
import { MapPin, Star, Verified } from "lucide-react";
import { publicApi } from "@/lib/api/public";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  let profile;
  let skills: Awaited<ReturnType<typeof publicApi.skills>>["items"] = [];
  try {
    [profile, skills] = await Promise.all([
      publicApi.profile(params.id),
      publicApi.skills(`?userId=${encodeURIComponent(params.id)}&type=OFFERING&limit=100`).then(result => result.items),
    ]);
  } catch {
    notFound();
  }
  if (!profile) notFound();
  return <PageContainer>
    <PageHeader title={profile.name} description={profile.headline || "TalentSwap member"} />
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <Card><CardContent className="p-6">
        <div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">{profile.name.slice(0, 2).toUpperCase()}</div><div><h2 className="font-semibold">{profile.name} {profile.verified && <Verified className="inline size-4 text-success" />}</h2><p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3" />{profile.location || "Location not provided"}</p></div></div>
        {profile.reviewCount > 0 && <div className="mt-5 flex items-center gap-2"><Star className="size-4 fill-current text-warning" /><span className="font-semibold">{profile.rating.toFixed(1)}</span><span className="text-sm text-muted-foreground">({profile.reviewCount} completed exchanges)</span></div>}
        {profile.verified && <div className="mt-4"><Badge>Verified member</Badge></div>}
        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{profile.bio || "This member has not added a bio yet."}</p>
      </CardContent></Card>
      <div><h2 className="mb-3 text-lg font-semibold">Skills offered</h2><div className="grid gap-4">{skills.length ? skills.map(skill => <Card key={skill.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{skill.title}</h3><p className="mt-1 text-sm text-muted-foreground">{skill.category?.name ?? "Uncategorized"} · {skill.proficiency.toLowerCase()}</p></div><Badge>{skill.pointRate} SP/hr</Badge></div><p className="mt-2 text-sm text-muted-foreground">{skill.description}</p></CardContent></Card>) : <Card><CardContent className="p-5 text-sm text-muted-foreground">No active public skills.</CardContent></Card>}</div></div>
    </div>
  </PageContainer>;
}
