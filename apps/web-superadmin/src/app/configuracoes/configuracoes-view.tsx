"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2, Palette, ShieldCheck, Lock, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const TEMAS = [
  { value: "dark_blue", label: "Azul escuro" },
  { value: "soft_purple", label: "Roxo suave" },
];

export function ConfiguracoesView({
  segments: initialSegments,
  roles: initialRoles,
  superAdminCount,
}: {
  segments: Tables<"segments">[];
  roles: Tables<"roles">[];
  superAdminCount: number;
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [segments, setSegments] = useState(initialSegments);
  const [roles, setRoles] = useState(initialRoles);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-heading text-3xl font-semibold mb-1">Configurações</h1>
      <p className="text-sm text-muted-foreground mb-6">Segmentos e papéis são catálogos dinâmicos — dá pra criar um novo sem alterar código.</p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Plataforma</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Super Admins ativos</span><span className="font-medium">{superAdminCount}</span></div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1"><Lock className="w-3 h-3" /> Chaves de API e secrets (Asaas, webhook) ficam só no servidor — não aparecem em nenhuma tela, mesmo pra Super Admin.</p>
        </CardContent>
      </Card>

      <SegmentsCard segments={segments} setSegments={setSegments} supabase={supabase} toast={toast} />
      <RolesCard roles={roles} setRoles={setRoles} supabase={supabase} toast={toast} />
    </main>
  );
}

type SupabaseClient = ReturnType<typeof createClient>;
type Toast = ReturnType<typeof useToast>["toast"];

function SegmentsCard({ segments, setSegments, supabase, toast }: { segments: Tables<"segments">[]; setSegments: React.Dispatch<React.SetStateAction<Tables<"segments">[]>>; supabase: SupabaseClient; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [novo, setNovo] = useState({ name: "", slug: "", theme_key: "dark_blue" });

  async function criar() {
    if (!novo.name.trim() || !novo.slug.trim()) {
      toast({ title: "Preencha nome e slug", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("segments").insert({ name: novo.name.trim(), slug: novo.slug.trim(), theme_key: novo.theme_key }).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Erro ao criar segmento", description: error?.message, variant: "destructive" });
      return;
    }
    setSegments((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNovo({ name: "", slug: "", theme_key: "dark_blue" });
    setOpen(false);
    toast({ title: "Segmento criado" });
  }

  async function alternarAtivo(seg: Tables<"segments">, active: boolean) {
    const { error } = await supabase.from("segments").update({ active }).eq("id", seg.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setSegments((prev) => prev.map((s) => (s.id === seg.id ? { ...s, active } : s)));
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Segmentos</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5" /> Novo segmento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo segmento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} placeholder="Ex: Clínica de Estética" /></div>
              <div className="space-y-1.5"><Label>Slug</Label><Input value={novo.slug} onChange={(e) => setNovo({ ...novo, slug: e.target.value })} placeholder="clinica-estetica" /></div>
              <div className="space-y-1.5">
                <Label>Tema (app do profissional)</Label>
                <Select value={novo.theme_key} onValueChange={(v) => setNovo({ ...novo, theme_key: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMAS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={criar} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {segments.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-sm">
            <span className="font-medium flex-1">{s.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{s.slug}</span>
            <span className="text-xs text-muted-foreground">{TEMAS.find((t) => t.value === s.theme_key)?.label ?? s.theme_key}</span>
            <Link href={`/configuracoes/segmentos/${s.id}/anamnese`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0">
              <ClipboardList className="w-3.5 h-3.5" /> Ficha de anamnese
            </Link>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">Ativo</Label>
              <Switch checked={s.active} onCheckedChange={(v) => alternarAtivo(s, v)} />
            </div>
          </div>
        ))}
        {segments.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum segmento cadastrado.</p>}
      </CardContent>
    </Card>
  );
}

function RolesCard({ roles, setRoles, supabase, toast }: { roles: Tables<"roles">[]; setRoles: React.Dispatch<React.SetStateAction<Tables<"roles">[]>>; supabase: SupabaseClient; toast: Toast }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [novo, setNovo] = useState({ key: "", label: "", description: "" });

  async function criar() {
    if (!novo.key.trim() || !novo.label.trim()) {
      toast({ title: "Preencha chave e rótulo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("roles").insert({ key: novo.key.trim(), label: novo.label.trim(), description: novo.description || null, is_system: false }).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Erro ao criar papel", description: error?.message, variant: "destructive" });
      return;
    }
    setRoles((prev) => [...prev, data].sort((a, b) => a.label.localeCompare(b.label)));
    setNovo({ key: "", label: "", description: "" });
    setOpen(false);
    toast({ title: "Papel criado" });
  }

  async function excluir(role: Tables<"roles">) {
    if (role.is_system) return;
    if (!window.confirm(`Excluir o papel "${role.label}"? Só é possível se nenhum usuário estiver com ele.`)) return;
    setDeletingId(role.id);
    const { error } = await supabase.from("roles").delete().eq("id", role.id);
    setDeletingId(null);
    if (error) {
      toast({ title: "Não foi possível excluir", description: "Existem usuários com esse papel.", variant: "destructive" });
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    toast({ title: "Papel excluído" });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Papéis (RBAC)</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5" /> Novo papel</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo papel</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Chave (usada no banco)</Label><Input value={novo.key} onChange={(e) => setNovo({ ...novo, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="ex: financeiro" /></div>
              <div className="space-y-1.5"><Label>Rótulo</Label><Input value={novo.label} onChange={(e) => setNovo({ ...novo, label: e.target.value })} placeholder="Financeiro" /></div>
              <div className="space-y-1.5"><Label>Descrição (opcional)</Label><Input value={novo.description} onChange={(e) => setNovo({ ...novo, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={criar} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-sm">
            <div className="flex-1">
              <span className="font-medium">{r.label}</span>{" "}
              <span className="text-xs text-muted-foreground font-mono">({r.key})</span>
              {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
            </div>
            {r.is_system ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground" title="Papel do sistema — não pode ser excluído">Sistema</span>
            ) : (
              <button onClick={() => excluir(r)} disabled={deletingId === r.id} className="p-1.5 rounded hover:bg-muted">
                {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
              </button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
