"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Pencil, Trash2, Percent, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

type Coupon = Tables<"coupons">;

const FORM_VAZIO = {
  code: "",
  name: "",
  description: "",
  tipoDesconto: "percent" as "percent" | "fixed",
  discount_percent: "",
  discount_amount: "",
  min_value: "",
  starts_at: "",
  ends_at: "",
  usage_limit: "",
  per_client_limit: "",
  active: true,
  servicoIds: [] as string[],
  profissionalIds: [] as string[],
};

export function CuponsView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Coupon | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [excluindo, setExcluindo] = useState<Coupon | null>(null);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: cupons = [], isLoading, isError } = useQuery({
    queryKey: ["coupons", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: profissionais = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  function statusDe(c: Coupon): { label: string; tone: string } {
    if (!c.active) return { label: "Inativo", tone: "text-muted-foreground" };
    if (c.ends_at && new Date(c.ends_at) < new Date()) return { label: "Expirado", tone: "text-destructive" };
    if (c.starts_at && new Date(c.starts_at) > new Date()) return { label: "Agendado", tone: "text-chart-4" };
    return { label: "Ativo", tone: "text-chart-2" };
  }

  async function salvar() {
    if (salvando) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: "Preencha código e nome", variant: "destructive" });
      return;
    }
    if (form.tipoDesconto === "percent" && !form.discount_percent) {
      toast({ title: "Informe o percentual de desconto", variant: "destructive" });
      return;
    }
    if (form.tipoDesconto === "fixed" && !form.discount_amount) {
      toast({ title: "Informe o valor de desconto", variant: "destructive" });
      return;
    }

    setSalvando(true);
    const payload = {
      company_id: companyId,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description || null,
      discount_percent: form.tipoDesconto === "percent" ? Number(form.discount_percent) : null,
      discount_amount: form.tipoDesconto === "fixed" ? Number(form.discount_amount) : null,
      min_value: form.min_value ? Number(form.min_value) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_client_limit: form.per_client_limit ? Number(form.per_client_limit) : null,
      active: form.active,
    };

    const { data: salvo, error } = editando
      ? await supabase.from("coupons").update(payload).eq("id", editando.id).select("id").single()
      : await supabase.from("coupons").insert(payload).select("id").single();

    if (error) {
      setSalvando(false);
      toast({
        title: "Erro ao salvar cupom",
        description: error.message.includes("coupons_company_code") ? "Já existe um cupom com esse código." : friendlyError(error, "salvar o cupom"),
        variant: "destructive",
      });
      return;
    }

    // regrava as regras de serviços/profissionais aplicáveis (vazio = aplica a todos)
    await supabase.from("coupon_services").delete().eq("coupon_id", salvo.id);
    await supabase.from("coupon_professionals").delete().eq("coupon_id", salvo.id);
    if (form.servicoIds.length > 0) {
      await supabase.from("coupon_services").insert(form.servicoIds.map((service_id) => ({ coupon_id: salvo.id, service_id })));
    }
    if (form.profissionalIds.length > 0) {
      await supabase.from("coupon_professionals").insert(form.profissionalIds.map((professional_id) => ({ coupon_id: salvo.id, professional_id })));
    }

    setSalvando(false);
    qc.invalidateQueries({ queryKey: ["coupons", companyId] });
    toast({ title: editando ? "Cupom atualizado" : "Cupom criado" });
    fecharDialog();
  }

  async function excluir() {
    if (!excluindo) return;
    setSalvandoExclusao(true);
    const { error } = await supabase.from("coupons").delete().eq("id", excluindo.id);
    setSalvandoExclusao(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir o cupom"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["coupons", companyId] });
    toast({ title: "Cupom removido" });
    setExcluindo(null);
  }

  async function editar(c: Coupon) {
    const [{ data: cs }, { data: cp }] = await Promise.all([
      supabase.from("coupon_services").select("service_id").eq("coupon_id", c.id),
      supabase.from("coupon_professionals").select("professional_id").eq("coupon_id", c.id),
    ]);
    setEditando(c);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description || "",
      tipoDesconto: c.discount_percent != null ? "percent" : "fixed",
      discount_percent: c.discount_percent != null ? String(c.discount_percent) : "",
      discount_amount: c.discount_amount != null ? String(c.discount_amount) : "",
      min_value: c.min_value != null ? String(c.min_value) : "",
      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : "",
      ends_at: c.ends_at ? c.ends_at.slice(0, 10) : "",
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
      per_client_limit: c.per_client_limit != null ? String(c.per_client_limit) : "",
      active: c.active,
      servicoIds: (cs || []).map((r) => r.service_id),
      profissionalIds: (cp || []).map((r) => r.professional_id),
    });
    setOpen(true);
  }

  function fecharDialog() {
    setOpen(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  function alternar(lista: string[], id: string) {
    return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">Descontos e promoções pros seus clientes</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : fecharDialog())}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo cupom</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editando ? "Editar cupom" : "Novo cupom"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: VERAO10" /></div>
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Promoção de verão" /></div>
              </div>
              <div><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

              <div>
                <Label>Tipo de desconto</Label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipoDesconto: "percent" })}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm", form.tipoDesconto === "percent" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentual
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tipoDesconto: "fixed" })}
                    className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm", form.tipoDesconto === "fixed" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Valor fixo
                  </button>
                </div>
              </div>
              {form.tipoDesconto === "percent" ? (
                <div><Label>Percentual de desconto (%)</Label><Input type="number" min={1} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} /></div>
              ) : (
                <div><Label>Valor do desconto</Label><CurrencyInput value={form.discount_amount} onValueChange={(v) => setForm({ ...form, discount_amount: v })} /></div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor mínimo do serviço</Label><CurrencyInput value={form.min_value} onValueChange={(v) => setForm({ ...form, min_value: v })} /></div>
                <div />
                <div><Label>Início da validade</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div><Label>Fim da validade</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
                <div><Label>Limite total de usos</Label><Input type="number" min={1} placeholder="Ilimitado" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></div>
                <div><Label>Limite por cliente</Label><Input type="number" min={1} placeholder="Ilimitado" value={form.per_client_limit} onChange={(e) => setForm({ ...form, per_client_limit: e.target.value })} /></div>
              </div>

              <div>
                <Label>Serviços aplicáveis</Label>
                <p className="text-xs text-muted-foreground mb-1.5">Nenhum marcado = aplica a todos os serviços</p>
                <div className="flex flex-wrap gap-2">
                  {servicos.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-2 py-1 cursor-pointer">
                      <Checkbox checked={form.servicoIds.includes(s.id)} onCheckedChange={() => setForm({ ...form, servicoIds: alternar(form.servicoIds, s.id) })} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Profissionais aplicáveis</Label>
                <p className="text-xs text-muted-foreground mb-1.5">Nenhum marcado = aplica a todos os profissionais</p>
                <div className="flex flex-wrap gap-2">
                  {profissionais.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-2 py-1 cursor-pointer">
                      <Checkbox checked={form.profissionalIds.includes(p.id)} onCheckedChange={() => setForm({ ...form, profissionalIds: alternar(form.profissionalIds, p.id) })} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Cupom ativo</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Criar cupom"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando cupons..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar os cupons." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cupons.map((c) => {
            const st = statusDe(c);
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-heading font-bold tracking-wide">{c.code}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.name}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editar(c)} title="Editar" aria-label="Editar cupom" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setExcluindo(c)} title="Excluir" aria-label="Excluir cupom" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-heading text-lg font-bold text-primary">
                      {c.discount_percent != null ? `${c.discount_percent}%` : formatCurrency(Number(c.discount_amount))}
                    </span>
                    <span className={cn("text-xs font-medium", st.tone)}>{st.label}</span>
                  </div>
                  {c.min_value != null && <p className="text-xs text-muted-foreground mt-1">Mínimo {formatCurrency(Number(c.min_value))}</p>}
                  {(c.usage_limit != null || c.per_client_limit != null) && (
                    <p className="text-xs text-muted-foreground">
                      {c.usage_limit != null && `Limite total: ${c.usage_limit}`}
                      {c.usage_limit != null && c.per_client_limit != null && " · "}
                      {c.per_client_limit != null && `Por cliente: ${c.per_client_limit}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {cupons.length === 0 && (
            <Card className="sm:col-span-2">
              <CardContent className="py-16 text-center text-muted-foreground">
                <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="mb-4">Você ainda não criou nenhum cupom.</p>
                <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Criar primeiro cupom</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir cupom?"
        description={excluindo ? `"${excluindo.code}" deixa de funcionar imediatamente. Essa ação não pode ser desfeita.` : ""}
        loading={salvandoExclusao}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
