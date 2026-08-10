"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const FORM_VAZIO = { name: "", role_title: "", start_time: "09:00", end_time: "18:00", active: true };

/**
 * Cadastro dos profissionais que atendem (barbeiros, cabeleireiras...) — quem
 * de fato aparece pro cliente escolher ao agendar. É diferente de
 * `company_members` (quem tem login no painel); um profissional pode não ter
 * conta própria ainda, só o registro aqui.
 */
export function EquipeView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tables<"professionals"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: profissionais = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  async function salvar() {
    const payload = {
      company_id: companyId,
      name: form.name,
      role_title: form.role_title || null,
      start_time: form.start_time,
      end_time: form.end_time,
      active: form.active,
    };
    const { error } = editando
      ? await supabase.from("professionals").update(payload).eq("id", editando.id)
      : await supabase.from("professionals").insert(payload);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["professionals", companyId] });
    toast({ title: editando ? "Profissional atualizado" : "Profissional cadastrado" });
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  async function excluir(profissional: Tables<"professionals">) {
    const { error } = await supabase.from("professionals").delete().eq("id", profissional.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["professionals", companyId] });
    toast({ title: "Profissional removido" });
  }

  function editar(profissional: Tables<"professionals">) {
    setEditando(profissional);
    setForm({
      name: profissional.name,
      role_title: profissional.role_title || "",
      start_time: profissional.start_time || "09:00",
      end_time: profissional.end_time || "18:00",
      active: profissional.active,
    });
    setOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground">Profissionais que atendem na sua empresa</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo profissional</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar profissional" : "Novo profissional"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Ex: barbeiro" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início do expediente</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><Label>Fim do expediente</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo (aparece pro cliente agendar)</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={!form.name}>{editando ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profissionais.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">{p.name[0]}</div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.role_title || "—"}{!p.active && " · inativo"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editar(p)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => excluir(p)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{p.start_time?.slice(0, 5)} — {p.end_time?.slice(0, 5)}</p>
            </CardContent>
          </Card>
        ))}
        {profissionais.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-muted-foreground">
              <UserCog className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum profissional cadastrado.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
