"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { skillSchema } from "@talentswap/validation";
import type { Skill } from "@talentswap/types";
import { useLiveQuery } from "@/lib/api/query";
import { skillsApi } from "@/lib/api/skills";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

const blank = { title: "", category: "", description: "", level: "INTERMEDIATE" as Skill["level"], pointsPerHour: 10, tags: "" };

export function SkillsPage() {
  const user = useAuthStore(state => state.user);
  const categories = useLiveQuery({ queryKey: ["skill-categories"], queryFn: skillsApi.categories });
  const skills = useLiveQuery({
    queryKey: ["skills", user?.id],
    queryFn: () => skillsApi.list(`?userId=${encodeURIComponent(user!.id)}&type=OFFERING&limit=100`),
    enabled: Boolean(user),
  });
  const [items, setItems] = useState<Skill[]>([]);
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Skill | null>(null); const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const [form, setForm] = useState(blank);
  const source = items.length ? items : (skills.data ?? []);
  useEffect(() => {
    if (!form.category && categories.data?.length) setForm(current => ({ ...current, category: categories.data![0].name }));
  }, [categories.data, form.category]);
  const visible = useMemo(() => source.filter(s => `${s.title} ${s.category} ${s.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [source, query]);
  const submit = async () => {
    const data = { ...form, pointsPerHour: Number(form.pointsPerHour), tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) };
    const result = skillSchema.safeParse(data); if (!result.success) { setError(result.error.issues[0]?.message ?? "Check the form."); return; }
    setSaving(true); setError("");
    try {
      const selectedCategory = categories.data?.find(category => category.name === result.data.category);
      if (!selectedCategory) { setError("Please choose a valid skill category."); return; }
      if (editing) { const updated = await skillsApi.update(editing.id, result.data, selectedCategory.id); setItems(xs => (xs.length ? xs : source).map(x => x.id === editing.id ? updated : x)); }
      else { const created = await skillsApi.create(result.data, selectedCategory.id); setItems(xs => [created, ...(xs.length ? xs : source)]); }
      setOpen(false); setEditing(null); setForm(blank); await skills.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save skill.");
    } finally { setSaving(false); }
  };
  const edit = (s: Skill) => { setEditing(s); setForm({ title: s.title, category: s.category, description: s.description, level: s.level, pointsPerHour: s.pointsPerHour, tags: s.tags.join(", ") }); setOpen(true); };
  const remove = async (id: string) => { setError(""); try { await skillsApi.remove(id); setItems(xs => (xs.length ? xs : source).filter(x => x.id !== id)); await skills.refetch(); } catch { setError("Unable to delete this skill. The backend is authoritative."); } };
  return <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
    {(skills.error || categories.error) && <Alert className="mb-4">Your skills or categories could not be loaded from the server. Start the API and retry.</Alert>}
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-semibold">Skills</h1><p className="text-sm text-muted-foreground">Create and manage the skills you can exchange.</p></div><Button disabled={!user || skills.isLoading || categories.isLoading || !categories.data?.length} onClick={() => { setEditing(null); setForm({ ...blank, category: categories.data?.[0]?.name ?? "" }); setOpen(true); }}><Plus className="size-4"/>Add skill</Button></div>
    <div className="mb-5 relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search your skills" value={query} onChange={e => setQuery(e.target.value)}/></div>
    {error && <Alert className="mb-4 border-destructive/30 text-destructive">{error}</Alert>}
    {open && <Card className="mb-6"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editing ? "Edit skill" : "New skill"}</h2><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></div><div className="space-y-2"><Label>Category</Label><Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{(categories.data ?? []).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></div><div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></div><div className="space-y-2"><Label>Level</Label><Select value={form.level} onChange={e => setForm({ ...form, level: e.target.value as Skill["level"] })}><option>BEGINNER</option><option>INTERMEDIATE</option><option>ADVANCED</option><option>EXPERT</option></Select></div><div className="space-y-2"><Label>Points / hour</Label><Input type="number" min="1" max="100" value={form.pointsPerHour} onChange={e => setForm({ ...form, pointsPerHour: Number(e.target.value) })}/></div><div className="space-y-2 sm:col-span-2"><Label>Tags</Label><Input placeholder="React, TypeScript, Testing" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}/></div></div><Button className="mt-5" disabled={saving || !categories.data?.length} onClick={() => void submit()}>{saving ? "Saving…" : editing ? "Save skill" : "Create skill"}</Button></CardContent></Card>}
    {skills.isLoading ? <div role="status">Loading skills…</div> : visible.length === 0 ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No skills found.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{visible.map(s => <Card key={s.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Badge variant="secondary">{s.category}</Badge><h2 className="mt-3 text-lg font-semibold">{s.title}</h2></div><span className="text-sm font-semibold">{s.pointsPerHour} pts/hr</span></div><p className="mt-2 text-sm text-muted-foreground">{s.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{s.tags.map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div><div className="mt-5 flex gap-2"><Button variant="outline" size="sm" onClick={() => edit(s)}><Pencil className="size-4"/>Edit</Button><Button variant="ghost" size="sm" onClick={() => void remove(s.id)}><Trash2 className="size-4"/>Delete</Button></div></CardContent></Card>)}</div>}
  </div>;
}
