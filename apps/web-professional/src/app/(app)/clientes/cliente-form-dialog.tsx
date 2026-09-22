"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

type Form = { name: string; phone: string; email: string; birth_date: string; notes: string };
const FORM_VAZIO: Form = { name: "", phone: "", email: "", birth_date: "", notes: "" };

/**
 * Cadastro/edição de cliente — usado pela lista (`clientes-view.tsx`, "Novo
 * cliente") e pela ficha (`[id]/cliente-ficha-view.tsx`, "Editar cliente").
 * Um componente só, pra não duplicar validação/campos entre os dois
 * lugares. Campos organizados em seções (pedido explícito da reformulação:
 * "não transformar em um formulário gigante").
 */
export function ClienteFormDialog({
  open,
  onOpenChange,
  companyId,
  cliente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  cliente: Tables<"clients"> | null;
  onSaved?: (clienteId: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const editando = !!cliente;

  useEffect(() => {
    if (open) {
      setForm(
        cliente
          ? {
              name: cliente.name,
              phone: cliente.phone || "",
              email: cliente.email || "",
              birth_date: cliente.birth_date || "",
              notes: cliente.notes || "",
            }
          : FORM_VAZIO
      );
    }
  }, [open, cliente]);

  async function salvar() {
    if (!form.name.trim()) return;
    setSalvando(true);
    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      birth_date: form.birth_date || null,
      notes: form.notes.trim() || null,
    };
    const { data, error } = cliente
      ? await supabase.from("clients").update(payload).eq("id", cliente.id).select("id").single()
      : await supabase.from("clients").insert(payload).select("id").single();
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar o cliente"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients", companyId] });
    if (cliente) qc.invalidateQueries({ queryKey: ["client-detail", cliente.id] });
    toast({ title: editando ? "Cliente atualizado" : "Cliente cadastrado" });
    onOpenChange(false);
    onSaved?.(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações pessoais</p>
            <div>
              <Label htmlFor="cf-name">Nome</Label>
              <Input id="cf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </div>
            <div>
              <Label htmlFor="cf-birth">Data de nascimento</Label>
              <Input
                id="cf-birth"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cf-phone">Telefone</Label>
                <Input id="cf-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cf-email">Email</Label>
                <Input id="cf-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</p>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Preferências, alergias conhecidas, observações gerais..." />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={!form.name.trim() || salvando} className="gap-2">
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            {editando ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
