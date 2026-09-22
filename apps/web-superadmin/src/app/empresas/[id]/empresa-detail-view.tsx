"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Ban, RotateCcw, Trash2, Save, UserCog2, Scissors, UsersRound, Receipt, KeyRound, LogIn, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { BUSINESS_SIZE_LABEL, GOAL_LABEL, STAFF_SIZE_LABEL } from "@/lib/onboarding-options";
import type { Tables } from "@/lib/supabase/database.types";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", received: "Recebido", overdue: "Atrasado", refunded: "Estornado", deleted: "Removido",
};
const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: "bg-chart-4/15 text-chart-4", confirmed: "bg-chart-2/15 text-chart-2", received: "bg-chart-2/15 text-chart-2",
  overdue: "bg-destructive/15 text-destructive", refunded: "bg-muted text-muted-foreground", deleted: "bg-muted text-muted-foreground",
};

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
  phone: string | null;
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
] as const;

// Endereço mora numa seção própria (ver ENDERECO_FIELDS/salvarEndereco) —
// os campos estruturados (rua/número/bairro/complemento/CEP/cidade/estado)
// são a única representação editável, pra nunca deixar duas telas
// gravando dois endereços diferentes pra mesma empresa (era exatamente o
// risco: o card "Informações" editava só o texto livre `address`).

export type ProfessionalRow = Pick<Tables<"professionals">, "id" | "name" | "role_title" | "active">;
type ClientRow = Pick<Tables<"clients">, "id" | "name" | "phone" | "created_at">;
export type ServiceRow = Pick<Tables<"services">, "id" | "name" | "price" | "duration_min" | "active">;
type PaymentRow = Tables<"subscription_payments">;
type ImpersonationRow = Tables<"impersonation_sessions">;

export function EmpresaDetailView({
  company,
  segments,
  plans,
  roles,
  subscription,
  users,
  professionals,
  clients,
  services,
  payments,
  impersonations,
  goals,
  termsAcceptance,
  usage,
}: {
  company: CompanyWithSegment;
  segments: Pick<Tables<"segments">, "id" | "name">[];
  plans: Tables<"plans">[];
  roles: Tables<"roles">[];
  subscription: SubscriptionWithPlan | null;
  users: CompanyUser[];
  professionals: ProfessionalRow[];
  clients: ClientRow[];
  services: ServiceRow[];
  payments: PaymentRow[];
  impersonations: ImpersonationRow[];
  goals: string[];
  termsAcceptance: Pick<Tables<"terms_acceptances">, "document_version" | "accepted_at"> | null;
  usage: { users: number; professionals: number; clients: number; appointments: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [impersonationRows, setImpersonationRows] = useState(impersonations);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  async function acessarComoEmpresa() {
    setImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", {
        body: {
          company_id: company.id,
          reason: impersonateReason || undefined,
          redirect_to: process.env.NEXT_PUBLIC_WEB_PROFESSIONAL_URL,
        },
      });
      if (error || !data?.url) throw new Error(data?.error || error?.message || "falha ao gerar acesso");
      window.open(data.url, "_blank", "noopener,noreferrer");
      setImpersonationRows((prev) => [
        { id: data.session_id, admin_id: "", company_id: company.id, target_user_id: "", reason: impersonateReason || null, started_at: new Date().toISOString(), ended_at: null, created_at: new Date().toISOString() },
        ...prev,
      ]);
      toast({ title: "Acesso gerado", description: `Aberto como ${data.target_email} em nova aba.` });
      setImpersonateOpen(false);
      setImpersonateReason("");
      router.refresh();
    } catch (e) {
      toast({ title: "Erro ao acessar como empresa", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setImpersonating(false);
    }
  }

  async function encerrarSessao(sessionId: string) {
    setEndingSessionId(sessionId);
    const { error } = await supabase.rpc("admin_end_impersonation", { session_id: sessionId });
    setEndingSessionId(null);
    if (error) {
      toast({ title: "Erro ao encerrar", description: error.message, variant: "destructive" });
      return;
    }
    setImpersonationRows((prev) => prev.map((s) => (s.id === sessionId ? { ...s, ended_at: new Date().toISOString() } : s)));
    toast({ title: "Sessão encerrada (registro de auditoria)" });
  }

  async function redefinirAcesso(userId: string) {
    setResettingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-user-password", {
        body: { user_id: userId, redirect_to: process.env.NEXT_PUBLIC_WEB_PROFESSIONAL_URL },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "E-mail de redefinição enviado", description: data.email });
    } catch (e) {
      toast({ title: "Erro ao redefinir acesso", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setResettingUserId(null);
    }
  }

  const [info, setInfo] = useState({
    name: company.name,
    segment_id: company.segment_id,
    other_segment: company.other_segment ?? "",
    anamnesis_enabled: company.anamnesis_enabled,
    trade_name: company.trade_name ?? "",
    document: company.document ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    whatsapp: company.whatsapp ?? "",
  });
  const segmentoSelecionadoEhOutro = segments.find((s) => s.id === info.segment_id)?.name === "Outro";
  const [endereco, setEndereco] = useState({
    zip_code: company.zip_code ?? "",
    street: company.street ?? "",
    address_number: company.address_number ?? "",
    complement: company.complement ?? "",
    neighborhood: company.neighborhood ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
  });
  const [status, setStatus] = useState(company.status);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingEndereco, setSavingEndereco] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [planId, setPlanId] = useState(subscription?.plan_id ?? "");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [userRows, setUserRows] = useState(users);
  const responsavel = userRows.find((u) => u.role_empresa === "owner") ?? userRows[0] ?? null;

  async function salvarInfo() {
    setSavingInfo(true);
    const { error } = await supabase.rpc("admin_update_company", {
      company_id: company.id,
      new_name: info.name,
      new_segment_id: info.segment_id,
      // Sempre manda o texto atual quando o segmento é "Outro" (mesmo sem
      // ter sido editado agora) — a RPC exige other_segment não-vazio
      // nesse caso e ignora o valor quando o segmento não é "Outro".
      new_other_segment: segmentoSelecionadoEhOutro ? info.other_segment || undefined : undefined,
      new_anamnesis_enabled: info.anamnesis_enabled,
      new_trade_name: info.trade_name || undefined,
      new_document: info.document || undefined,
      new_email: info.email || undefined,
      new_phone: info.phone || undefined,
      new_whatsapp: info.whatsapp || undefined,
    });
    setSavingInfo(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Empresa atualizada" });
    router.refresh();
  }

  // Único caminho de edição de endereço — sempre manda os campos
  // estruturados, nunca `new_address` isolado, pra `admin_update_company`
  // recalcular o texto legado a partir deles (ver migration
  // company_address_single_source_of_truth) e nunca deixar as duas
  // representações divergirem.
  async function salvarEndereco() {
    setSavingEndereco(true);
    const { error } = await supabase.rpc("admin_update_company", {
      company_id: company.id,
      new_zip_code: endereco.zip_code || undefined,
      new_street: endereco.street || undefined,
      new_address_number: endereco.address_number || undefined,
      new_complement: endereco.complement || undefined,
      new_neighborhood: endereco.neighborhood || undefined,
      new_city: endereco.city || undefined,
      new_state: endereco.state || undefined,
    });
    setSavingEndereco(false);
    if (error) {
      toast({ title: "Erro ao salvar endereço", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Endereço atualizado" });
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

  async function atualizarRole(memberId: string, role_empresa: string) {
    setSavingMemberId(memberId);
    const { error } = await supabase.from("company_members").update({ role_empresa }).eq("id", memberId);
    setSavingMemberId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setUserRows((prev) => prev.map((u) => (u.member_id === memberId ? { ...u, role_empresa } : u)));
    toast({ title: "Usuário atualizado" });
  }

  // Ativar/desativar passa pela RPC (não update direto) porque isso é
  // literalmente "bloqueio/desbloqueio de usuário" — a auditoria desse tipo
  // de ação é pedida explicitamente.
  async function alternarAcessoMembro(memberId: string, active: boolean) {
    setSavingMemberId(memberId);
    const { error } = await supabase.rpc("admin_set_member_active", { member_id: memberId, new_active: active });
    setSavingMemberId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setUserRows((prev) => prev.map((u) => (u.member_id === memberId ? { ...u, active } : u)));
    toast({ title: active ? "Acesso reativado" : "Acesso bloqueado" });
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

        <div className="flex gap-2 flex-wrap">
          <Dialog open={impersonateOpen} onOpenChange={setImpersonateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={status === "deleted"}>
                <LogIn className="w-4 h-4" /> Acessar como empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Acessar como {company.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Abre uma sessão real do proprietário da empresa em outra aba, pra investigar um problema. Fica registrado em auditoria (quem, quando, motivo).
                  A senha do usuário nunca é revelada.
                </p>
                <div className="space-y-1.5">
                  <Label>Motivo (opcional, mas recomendado)</Label>
                  <Input value={impersonateReason} onChange={(e) => setImpersonateReason(e.target.value)} placeholder="Ex: investigar agendamento duplicado" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={acessarComoEmpresa} disabled={impersonating}>
                  {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Gerar acesso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
            {segmentoSelecionadoEhOutro && (
              <div className="space-y-1.5">
                <Label>Outro segmento</Label>
                <Input
                  value={info.other_segment}
                  onChange={(e) => setInfo({ ...info, other_segment: e.target.value })}
                  placeholder="Obrigatório quando o segmento é Outro"
                />
              </div>
            )}
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
                  <div className="pt-2 mt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Cobrança (Asaas)</p>
                    {company.asaas_customer_id && subscription.asaas_subscription_id ? (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-mono text-xs">{company.asaas_customer_id}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Assinatura</span><span className="font-mono text-xs">{subscription.asaas_subscription_id}</span></div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Não configurada — a cobrança recorrente não foi criada no Asaas (ver aviso na criação, ou o CNPJ/CPF pode estar faltando).</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Nenhuma assinatura registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Cadastro do trial</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground -mt-1">
            O que a pessoa respondeu no cadastro de 5 etapas — só leitura aqui; para corrigir nome/segmento/contato use o card &ldquo;Informações&rdquo; acima.
          </p>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Responsável</p>
            {responsavel ? (
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Nome completo</p><p>{responsavel.full_name ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">E-mail</p><p>{responsavel.email ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Telefone</p><p>{responsavel.phone ?? "—"}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Negócio</p>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Segmento</p>
                <p>{company.segments?.name ?? "—"}</p>
              </div>
              {company.segments?.name === "Outro" && (
                <div><p className="text-xs text-muted-foreground">Outro segmento</p><p>{company.other_segment ?? "—"}</p></div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Tipo do negócio</p>
                <p>{company.business_size ? BUSINESS_SIZE_LABEL[company.business_size] ?? company.business_size : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nº de profissionais</p>
                <p>{company.staff_size_range ? STAFF_SIZE_LABEL[company.staff_size_range] ?? company.staff_size_range : "—"}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Endereço</p>
            <p className="text-xs text-muted-foreground mb-3">
              Única tela que edita o endereço da empresa — grava aqui, nunca em texto livre solto.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">CEP</Label><Input value={endereco.zip_code} onChange={(e) => setEndereco({ ...endereco, zip_code: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Rua</Label><Input value={endereco.street} onChange={(e) => setEndereco({ ...endereco, street: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Número</Label><Input value={endereco.address_number} onChange={(e) => setEndereco({ ...endereco, address_number: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Complemento</Label><Input value={endereco.complement} onChange={(e) => setEndereco({ ...endereco, complement: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Bairro</Label><Input value={endereco.neighborhood} onChange={(e) => setEndereco({ ...endereco, neighborhood: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Cidade</Label><Input value={endereco.city} onChange={(e) => setEndereco({ ...endereco, city: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Estado</Label><Input value={endereco.state} onChange={(e) => setEndereco({ ...endereco, state: e.target.value.toUpperCase() })} maxLength={2} className="uppercase" /></div>
            </div>
            <Button size="sm" className="mt-3" onClick={salvarEndereco} disabled={savingEndereco}>
              {savingEndereco ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar endereço
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Objetivos</p>
            {goals.length > 0 ? (
              <ul className="text-sm space-y-1">
                {goals.map((g) => (
                  <li key={g} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-2 shrink-0" /> {GOAL_LABEL[g] ?? g}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum objetivo selecionado no cadastro.</p>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Aceite do contrato</p>
            {termsAcceptance ? (
              <p className="text-sm flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-chart-2 shrink-0" />
                Versão {termsAcceptance.document_version} aceita em {formatDateTime(termsAcceptance.accepted_at)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aceite registrado pra esta empresa.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
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
              <Select value={u.role_empresa} onValueChange={(v) => atualizarRole(u.member_id, v)}>
                <SelectTrigger className="w-[160px]" disabled={savingMemberId === u.member_id}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={resettingUserId === u.user_id}
                onClick={() => redefinirAcesso(u.user_id)}
                title="Envia e-mail de redefinição de senha pro usuário"
              >
                {resettingUserId === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Redefinir acesso
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ativo</Label>
                <Switch checked={u.active} disabled={savingMemberId === u.member_id} onCheckedChange={(v) => alternarAcessoMembro(u.member_id, v)} />
              </div>
            </div>
          ))}
          {userRows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário vinculado.</p>}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog2 className="w-4 h-4" /> Profissionais ({professionals.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {professionals.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1">
                <span className={p.active ? "" : "text-muted-foreground line-through"}>{p.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{p.role_title ?? ""}</span>
              </div>
            ))}
            {professionals.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum profissional.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scissors className="w-4 h-4" /> Serviços ({services.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm py-1">
                <span className={s.active ? "" : "text-muted-foreground line-through"}>{s.name}</span>
                <span className="text-xs text-muted-foreground">{formatCurrency(Number(s.price))}</span>
              </div>
            ))}
            {services.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum serviço.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UsersRound className="w-4 h-4" /> Clientes ({usage.clients})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm py-1">
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.phone ?? ""}</span>
              </div>
            ))}
            {clients.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente.</p>}
            {usage.clients > clients.length && <p className="text-xs text-muted-foreground text-center pt-1">+{usage.clients - clients.length} outros</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" /> Pagamentos da assinatura (Asaas)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border text-sm">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLOR[p.status] ?? ""}`}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</span>
              <span className="font-medium">{formatCurrency(Number(p.value))}</span>
              <span className="text-xs text-muted-foreground">{p.billing_type ?? "—"}</span>
              <span className="text-xs text-muted-foreground ml-auto">venc. {p.due_date ? formatDate(p.due_date) : "—"}</span>
              <span className="text-xs text-muted-foreground font-mono">{p.asaas_payment_id}</span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum pagamento registrado ainda (o webhook do Asaas grava aqui automaticamente).</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de &ldquo;Acessar como empresa&rdquo;</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {impersonationRows.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border text-sm">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${s.ended_at ? "bg-muted text-muted-foreground" : "bg-chart-2/15 text-chart-2"}`}>
                {s.ended_at ? "Encerrada" : "Em aberto"}
              </span>
              <span className="text-xs text-muted-foreground">{formatDateTime(s.started_at)}</span>
              {s.reason && <span className="text-xs text-muted-foreground italic">&ldquo;{s.reason}&rdquo;</span>}
              {!s.ended_at && (
                <Button variant="ghost" size="sm" className="ml-auto" disabled={endingSessionId === s.id} onClick={() => encerrarSessao(s.id)}>
                  {endingSessionId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Registrar fim"}
                </Button>
              )}
            </div>
          ))}
          {impersonationRows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum acesso registrado.</p>}
        </CardContent>
      </Card>
    </main>
  );
}

// Alias puramente estrutural pro wrapper de abas (central-tabs.tsx)
// repassar as mesmas props sem duplicar a lista inteira aqui.
export type EmpresaDetailViewProps = Parameters<typeof EmpresaDetailView>[0];
