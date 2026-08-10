"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Pencil, Trash2, Phone, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const FORM_VAZIO = { name: "", phone: "", email: "", notes: "" };

export function ClientesView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Tables<"clients"> | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });

  async function salvar() {
    const payload = { company_id: companyId, name: form.name, phone: form.phone || null, email: form.email || null, notes: form.notes || null };
    const { error } = editando
      ? await supabase.from("clients").update(payload).eq("id", editando.id)
      : await supabase.from("clients").insert(payload);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients", companyId] });
    toast({ title: editando ? "Cliente atualizado" : "Cliente cadastrado" });
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  async function excluir(cliente: Tables<"clients">) {
    const { error } = await supabase.from("clients").delete().eq("id", cliente.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients", companyId] });
    toast({ title: "Cliente removido" });
  }

  function editar(cliente: Tables<"clients">) {
    setEditando(cliente);
    setForm({ name: cliente.name, phone: cliente.phone || "", email: cliente.email || "", notes: cliente.notes || "" });
    setOpen(true);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={!form.name}>{editando ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clientes.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">{c.name[0]}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-1">
                      {c.name}
                      {c.user_id && <ShieldCheck className="w-3 h-3 text-primary shrink-0" aria-label="Tem conta própria" />}
                    </p>
                    {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
                    {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /> {c.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => editar(c)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => excluir(c)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
              {c.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{c.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {clientes.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum cliente cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
