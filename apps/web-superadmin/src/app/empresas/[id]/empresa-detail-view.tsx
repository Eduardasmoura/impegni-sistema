"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Ban, RotateCcw, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<string, string> = {
  trial: "Teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  suspended: "Suspensa",
  canceled: "Cancelada",
  expired: "Expirada",
  deleted: "Excluída",
};
const STATUS_COLOR: Record<string, string> = {
  trial: "bg-chart-4/15 text-chart-4",
  active: "bg-chart-2/15 text-chart-2",
  past_due: "bg-chart-4/15 text-chart-4",
  suspended: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
};

type CompanyWithSegment = Tables<"companies"> & { segments: Pick<Tables<"segments">, "id" | "name"> | null };
type SubscriptionWithPlan = Tables<"subscriptions"> & { plans: Tables<"plans"> | null };
type CompanyUser = {
  member_id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role_empresa: string;
  active: boolean;
  member_created_at: string;
};

const INFO_FIELDS = [
  ["trade_name", "Nome fantasia"],
  ["document", "CNPJ/CPF"],
  ["email", "E-mail"],
  ["phone", "Telefone"],
  ["whatsapp", "WhatsApp"],
  ["address", "Endereço"],
  ["city", "Cidade"],
  ["state", "Estado"],
  ["zip_code", "CEP"],
] as const;

export function EmpresaDetailView({
  company,
  segments,
  plans,
  roles,
  subscription,
  users,
  usage,
}: {
  company: CompanyWithSegment;
  segments: Pick<Tables<"segments">, "id" | "name">[];
  plans: Tables<"plans">[];
  roles: Tables<"roles">[];
  subscription: SubscriptionWithPlan | null;
  users: CompanyUser[];
  usage: { users: number; professionals: number; clients: number; appointments: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [info, setInfo] = useState({
    name: company.name,
    segment_id: company.segment_id,
    anamnesis_enabled: company.anamnesis_enabled,
    trade_name: company.trade_name ?? "",
    document: company.document ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip_code: company.zip_code ?? "",
  });
  const [status, setStatus] = useState(company.status);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [planId, setPlanId] = useState(subscription?.plan_id ?? "");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [userRows, setUserRows] = useState(users);

  async function salvarInfo() {
    setSavingInfo(true);
    const { error } = await supabase.rpc("admin_update_company", {
      company_id: company.id,
      new_name: info.name,
      new_segment_id: info.segment_id,
      new_anamnesis_enabled: info.anamnesis_enabled,
      new_trade_name: info.trade_name || undefined,
      new_document: info.document || undefined,
      new_email: info.email || undefined,
      new_phone: info.phone || undefined,
      new_whatsapp: info.whatsapp || undefined,
      new_address: info.address || undefined,
      new_city: info.city || undefined,
      new_state: info.state || undefined,
      new_zip_code: info.zip_code || undefined,
    });
    setSavingInfo(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Empresa atualizada" });
    router.refresh();
  }

  async function alterarStatus(newStatus: string) {
    setSavingStatus(true);
    const { error } = await supabase.rpc("admin_update_company", { company_id: company.id, new_status: newStatus });
    setSavingStatus(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setStatus(newStatus);
    toast({ title: newStatus === "deleted" ? "Empresa excluída" : "Status atualizado" });
    router.refresh();
  }

  function excluir() {
    if (!window.confirm(`Excluir "${company.name}"? A empresa fica marcada como excluída e some das listagens — nenhum dado é apagado.`)) return;
    alterarStatus("deleted");
  }

  async function salvarPlano() {
    if (!planId) return;
    setSavingPlan(true);
    const { error } = await supabase.rpc("admin_change_plan", { company_id: company.id, new_plan_id: planId });
    setSavingPlan(false);
    if (error) {
      toast({ title: "Erro ao trocar plano", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plano atualizado" });
    router.refresh();
  }

  async function atualizarMembro(memberId: string, patch: { role_empresa?: string; active?: boolean }) {
    setSavingMemberId(memberId);
    const { error } = await supabase.from("company_members").update(patch).eq("id", memberId);
    setSavingMemberId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setUserRows((prev) => prev.map((u) => (u.member_id === memberId ? { ...u, ...patch } : u)));
    toast({ title: "Usuário atualizado" });
  }

  const plan = plans.find((p) => p.id === planId) ?? subscription?.plans ?? null;
  const limits: { key: keyof typeof usage; label: string; max: number | null }[] = [
    { key: "users", label: "Usuários", max: plan?.max_users ?? null },
    { key: "professionals", label: "Profissionais", max: plan?.max_professionals ?? null },
    { key: "clients", label: "Clientes", max: plan?.max_clients ?? null },
    { key: "appointments", label: "Agendamentos (mês)", max: plan?.max_appointments ?? null },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/empresas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-3xl font-semibold">{company.name}</h1>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] ?? ""}`}>{STATUS_LABEL[status] ?? status}</span>
          </div>
          <a
            href={`https://${company.slug}.inova.app`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mt-1"
          >
            {company.slug}.inova.app <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex gap-2">
          {status !== "suspended" && status !== "deleted" && (
            <Button variant="outline" size="sm" disabled={savingStatus} onClick={() => alterarStatus("suspended")}>
              <Ban className="w-4 h-4" /> Suspender
            </Button>
          )}
          {(status === "suspended" || status === "expired" || status === "canceled") && (
            <Button variant="outline" size="sm" disabled={savingStatus} onClick={() => alterarStatus("active")}>
              <RotateCcw className="w-4 h-4" /> Reativar
            </Button>
          )}
          {status !== "deleted" && (
            <Button variant="destructive" size="sm" disabled={savingStatus} onClick={excluir}>
              <Trash2 className="w-4 h-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Segmento</Label>
              <Select value={info.segment_id} onValueChange={(v) => setInfo({ ...info, segment_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {INFO_FIELDS.map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input value={info[key]} onChange={(e) => setInfo({ ...info, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label>Ficha de Anamnese habilitada</Label>
              <Switch checked={info.anamnesis_enabled} onCheckedChange={(v) => setInfo({ ...info, anamnesis_enabled: v })} />
            </div>
            <Button onClick={salvarInfo} disabled={savingInfo} className="w-full">
              {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar informações
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Plano e uso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {formatCurrency(p.price_cents / 100)}/mês</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={salvarPlano} disabled={savingPlan || planId === subscription?.plan_id}>
                  {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Trocar"}
                </Button>
              </div>

              <div className="space-y-3">
                {limits.map(({ key, label, max }) => {
                  const current = usage[key];
                  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{current} / {max ?? "∞"}</span>
                      </div>
                      {max !== null && (
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Assinatura</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {subscription ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium">{STATUS_LABEL[subscription.status] ?? subscription.status}</span></div>
                  {subscription.trial_ends_at && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Teste até</span><span>{formatDateTime(subscription.trial_ends_at)}</span></div>
                  )}
                  {subscription.current_period_end && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Período atual até</span><span>{formatDate(subscription.current_period_end)}</span></div>
                  )}
                  {subscription.canceled_at && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Cancelada em</span><span>{formatDate(subscription.canceled_at)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Cliente desde</span><span>{formatDate(company.created_at)}</span></div>
                </>
              ) : (
                <p className="text-muted-foreground">Nenhuma assinatura registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários ({userRows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {userRows.map((u) => (
            <div key={u.member_id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium">{u.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Select value={u.role_empresa} onValueChange={(v) => atualizarMembro(u.member_id, { role_empresa: v })}>
                <SelectTrigger className="w-[160px]" disabled={savingMemberId === u.member_id}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ativo</Label>
                <Switch checked={u.active} disabled={savingMemberId === u.member_id} onCheckedChange={(v) => atualizarMembro(u.member_id, { active: v })} />
              </div>
            </div>
          ))}
          {userRows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário vinculado.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
