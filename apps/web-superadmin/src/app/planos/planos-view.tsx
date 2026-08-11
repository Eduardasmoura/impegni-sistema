"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Save, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

const LIMIT_FIELDS = [
  ["max_users", "Máx. usuários"],
  ["max_professionals", "Máx. profissionais"],
  ["max_clients", "Máx. clientes"],
  ["max_appointments", "Máx. agendamentos/mês"],
] as const;

const NOVO_PLANO: { name: string; price_cents: string; billing_interval: "monthly" | "yearly" } = { name: "", price_cents: "", billing_interval: "monthly" };

export function PlanosView({ plans: initialPlans, features: initialFeatures }: { plans: Tables<"plans">[]; features: Tables<"plan_features">[] }) {
  const { toast } = useToast();
  const supabase = createClient();
  const [plans, setPlans] = useState(initialPlans);
  const [features, setFeatures] = useState(initialFeatures);
  const [novo, setNovo] = useState(NOVO_PLANO);
  const [criando, setCriando] = useState(false);
  const [open, setOpen] = useState(false);

  async function criarPlano() {
    if (!novo.name.trim() || !novo.price_cents) {
      toast({ title: "Preencha nome e preço", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { data, error } = await supabase
      .from("plans")
      .insert({ name: novo.name.trim(), price_cents: Math.round(Number(novo.price_cents) * 100), billing_interval: novo.billing_interval })
      .select()
      .single();
    setCriando(false);
    if (error || !data) {
      toast({ title: "Erro ao criar plano", description: error?.message, variant: "destructive" });
      return;
    }
    setPlans((prev) => [...prev, data].sort((a, b) => a.price_cents - b.price_cents));
    setNovo(NOVO_PLANO);
    setOpen(false);
    toast({ title: "Plano criado" });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">Limites e recursos disponíveis para cada plano — sem precisar mexer em código.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Novo plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo plano</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} placeholder="Ex: Avançado" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço (R$/mês)</Label>
                  <Input type="number" min="0" step="0.01" value={novo.price_cents} onChange={(e) => setNovo({ ...novo, price_cents: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cobrança</Label>
                  <Select value={novo.billing_interval} onValueChange={(v) => setNovo({ ...novo, billing_interval: v as "monthly" | "yearly" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={criarPlano} disabled={criando}>{criando && <Loader2 className="w-4 h-4 animate-spin" />} Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            features={features.filter((f) => f.plan_id === plan.id)}
            onPlanChange={(updated) => setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
            onPlanRemove={(id) => setPlans((prev) => prev.filter((p) => p.id !== id))}
            onFeaturesChange={(planId, updater) => setFeatures((prev) => updater(prev, planId))}
          />
        ))}
        {plans.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum plano cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function PlanCard({
  plan,
  features,
  onPlanChange,
  onPlanRemove,
  onFeaturesChange,
}: {
  plan: Tables<"plans">;
  features: Tables<"plan_features">[];
  onPlanChange: (plan: Tables<"plans">) => void;
  onPlanRemove: (id: string) => void;
  onFeaturesChange: (planId: string, updater: (prev: Tables<"plan_features">[], planId: string) => Tables<"plan_features">[]) => void;
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: plan.name,
    price: String(plan.price_cents / 100),
    billing_interval: plan.billing_interval,
    active: plan.active,
    max_users: plan.max_users?.toString() ?? "",
    max_professionals: plan.max_professionals?.toString() ?? "",
    max_clients: plan.max_clients?.toString() ?? "",
    max_appointments: plan.max_appointments?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [novaFeature, setNovaFeature] = useState("");

  async function salvar() {
    setSaving(true);
    const payload = {
      name: form.name,
      price_cents: Math.round(Number(form.price) * 100),
      billing_interval: form.billing_interval,
      active: form.active,
      max_users: form.max_users === "" ? null : Number(form.max_users),
      max_professionals: form.max_professionals === "" ? null : Number(form.max_professionals),
      max_clients: form.max_clients === "" ? null : Number(form.max_clients),
      max_appointments: form.max_appointments === "" ? null : Number(form.max_appointments),
    };
    const { data, error } = await supabase.from("plans").update(payload).eq("id", plan.id).select().single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Erro ao salvar plano", description: error?.message, variant: "destructive" });
      return;
    }
    onPlanChange(data);
    toast({ title: "Plano salvo" });
  }

  async function excluir() {
    if (!window.confirm(`Excluir o plano "${plan.name}"? Só é possível se nenhuma empresa estiver assinando-o.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("plans").delete().eq("id", plan.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Não foi possível excluir", description: "Existem empresas nesse plano. Desative-o em vez de excluir.", variant: "destructive" });
      return;
    }
    onPlanRemove(plan.id);
    toast({ title: "Plano excluído" });
  }

  async function adicionarFeature() {
    const key = novaFeature.trim();
    if (!key) return;
    const { data, error } = await supabase
      .from("plan_features")
      .insert({ plan_id: plan.id, feature_key: key, enabled: true })
      .select()
      .single();
    if (error || !data) {
      toast({ title: "Erro ao adicionar recurso", description: error?.message, variant: "destructive" });
      return;
    }
    onFeaturesChange(plan.id, (prev) => [...prev, data]);
    setNovaFeature("");
  }

  async function atualizarFeature(feature: Tables<"plan_features">, patch: Partial<TablesInsert<"plan_features">>) {
    const { data, error } = await supabase.from("plan_features").update(patch).eq("id", feature.id).select().single();
    if (error || !data) {
      toast({ title: "Erro ao atualizar recurso", description: error?.message, variant: "destructive" });
      return;
    }
    onFeaturesChange(plan.id, (prev) => prev.map((f) => (f.id === feature.id ? data : f)));
  }

  async function removerFeature(feature: Tables<"plan_features">) {
    const { error } = await supabase.from("plan_features").delete().eq("id", feature.id);
    if (error) {
      toast({ title: "Erro ao remover recurso", description: error.message, variant: "destructive" });
      return;
    }
    onFeaturesChange(plan.id, (prev) => prev.filter((f) => f.id !== feature.id));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          {plan.name}
          {!form.active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">Inativo</span>}
        </CardTitle>
        <span className="text-sm text-muted-foreground">{formatCurrency(plan.price_cents / 100)}/mês</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Preço (R$/mês)</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LIMIT_FIELDS.map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                min="0"
                placeholder="∞"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Deixe em branco para ilimitado.</p>

        <div className="flex items-center justify-between">
          <Label>Plano ativo (visível na criação de empresas)</Label>
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Recursos</p>
          <div className="space-y-2">
            {features.map((f) => (
              <div key={f.id} className="flex items-center gap-2 flex-wrap">
                <span className="text-sm flex-1 min-w-[120px] font-mono">{f.feature_key}</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="sem limite"
                  className="w-32 h-8 text-xs"
                  value={f.limit_value?.toString() ?? ""}
                  onChange={(e) => atualizarFeature(f, { limit_value: e.target.value === "" ? null : Number(e.target.value) })}
                />
                <Switch checked={f.enabled} onCheckedChange={(v) => atualizarFeature(f, { enabled: v })} />
                <button onClick={() => removerFeature(f)} className="p-1 rounded hover:bg-muted">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="chave do recurso (ex: anamnesis)"
                className="h-8 text-xs"
                value={novaFeature}
                onChange={(e) => setNovaFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarFeature())}
              />
              <Button type="button" variant="outline" size="sm" onClick={adicionarFeature}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="destructive" size="sm" onClick={excluir} disabled={deleting}>
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir
          </Button>
          <Button type="button" size="sm" onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
