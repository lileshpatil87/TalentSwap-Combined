"use client";
import { useEffect, useState } from "react";
import { profileSchema } from "@talentswap/validation";
import { Save, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { profileApi } from "@/lib/api/profile";
import { useLiveQuery } from "@/lib/api/query";
import { demoUser } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ApiRequestError } from "@/lib/api";

export function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const id = user?.id ?? demoUser.id;
  const profile = useLiveQuery({ queryKey: ["profile", id], queryFn: () => profileApi.get(id), fallback: demoUser, enabled: Boolean(user) });
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(demoUser);
  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);
  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const save = async () => {
    const result = profileSchema.safeParse({ ...form, languages: form.languages });
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Please check the form."); return; }
    setSaving(true); setError("");
    try {
      const updated = await profileApi.update(id, result.data);
      setForm(updated); setSaved(true); setEditing(false);
    } catch (cause) {
      if (cause instanceof TypeError || cause instanceof ApiRequestError) setError(cause.message);
      else setError("Unable to save profile. Please try again.");
    } finally { setSaving(false); }
  };
  if (profile.isLoading) return <div className="p-8" role="status">Loading profile…</div>;
  if (profile.error && !profile.data) return <div className="p-8"><Alert className="border-destructive/30 text-destructive">{profile.errorMessage}</Alert></div>;
  return <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
    {profile.fallbackUsed && <Alert className="mb-4">API unavailable; showing demo data. Changes require a live backend.</Alert>}
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold">Your profile</h1><p className="text-sm text-muted-foreground">Manage the public information partners see.</p></div><Button onClick={() => { setEditing(!editing); setSaved(false); }}>{editing ? "Cancel" : "Edit profile"}</Button></div>
    {saved && <Alert className="mb-5 border-success/30 text-success">Profile saved successfully.</Alert>}{error && <Alert className="mb-5 border-destructive/30 text-destructive">{error}</Alert>}
    <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]"><Card><CardContent className="p-6"><div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">{form.name.slice(0,2).toUpperCase()}</div><h2 className="mt-4 text-xl font-semibold">{form.name}</h2><p className="text-sm text-muted-foreground">{form.headline}</p><div className="mt-4 flex flex-wrap gap-2"><Badge><ShieldCheck className="mr-1 size-3"/>Verified</Badge>{form.languages.map(l => <Badge key={l} variant="outline">{l}</Badge>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Profile details</CardTitle></CardHeader><CardContent>{editing ? <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)}/></div><div className="space-y-2"><Label>Headline</Label><Input value={form.headline ?? ""} onChange={e => update("headline", e.target.value)}/></div></div><div className="space-y-2"><Label>Bio</Label><Textarea value={form.bio} onChange={e => update("bio", e.target.value)}/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Location</Label><Input value={form.location ?? ""} onChange={e => update("location", e.target.value)}/></div><div className="space-y-2"><Label>Availability</Label><Input value={form.availability} onChange={e => update("availability", e.target.value)}/></div></div><div className="space-y-2"><Label>Timezone</Label><Input value={form.timezone} onChange={e => update("timezone", e.target.value)}/></div><Button disabled={saving || profile.fallbackUsed} onClick={() => void save()}><Save className="size-4"/>{saving ? "Saving…" : "Save changes"}</Button></div> : <dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Bio</dt><dd className="mt-1 text-sm leading-6">{form.bio}</dd></div><div><dt className="text-xs text-muted-foreground">Location</dt><dd className="mt-1 text-sm">{form.location}</dd></div><div><dt className="text-xs text-muted-foreground">Availability</dt><dd className="mt-1 text-sm">{form.availability}</dd></div><div><dt className="text-xs text-muted-foreground">Timezone</dt><dd className="mt-1 text-sm">{form.timezone}</dd></div></dl>}</CardContent></Card></div>
  </div>;
}
