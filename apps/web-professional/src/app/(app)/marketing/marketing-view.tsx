"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Megaphone, Cake, RotateCcw, Pencil, Trash2, Phone, Info, ChevronDown, MessageCircle, Sparkles, CalendarDays, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { OCCASIONS, occasionLabel, periodoSugerido, statusDaCampanha, whatsappLink, type CampaignKind } from "@/lib/campaign-occasions";
import type { Tables } from "@/lib/supabase/database.types";

type Rule = Tables<"campaign_rules">;
type Campaign = Tables<"campaigns">;
type Aniversariante = { client_id: string; name: string; phone: string | null; next_birthday: string; days_until: number };
type Recuperacao = { client_id: string; name: string; phone: string | null; last_appointment_at: string };

// Uma linha da lista — unifica as duas origens (campanhas automáticas em
// `campaign_rules` e as por data/personalizadas em `campaigns`).
type Item =
  | { origem: "rule"; kind: "birthday" | "recovery"; rule: Rule }
  | { origem: "campaign"; kind: CampaignKind; campaign: Campaign };

const STATUS_STYLE = {
  ativa: { label: "Ativa", tone: "bg-chart-2/15 text-chart-2" },
  agendada: { label: "Agendada", tone: "bg-chart-4/15 text-chart-4" },
  encerrada: { label: "Encerrada", tone: "bg-destructive/10 text-destructive" },
  inativa: { label: "Inativa", tone: "bg-muted text-muted-foreground" },
} as const;

const FORM_VAZIO = { kind: "personalizada" as CampaignKind, name: "", message: "", starts_on: "", ends_on: "", enabled: true, dias: "60" };

/**
 * Campanhas — lista + "Nova campanha" (mesmo padrão da página de Cupons). Na
 * criação a pessoa escolhe a campanha: Aniversário, Recuperação, Dia das Mães,
 * Dia do Amigo, Natal, Black Friday..., ou uma Personalizada.
 * Continua sem envio automático: ativar registra a intenção; o contato é feito
 * por fora (a lista de clientes traz o link do WhatsApp com a mensagem pronta).
 */
export function MarketingView({ companyId, isManager }: { companyId: string; isManager: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passo, setPasso] = useState<"escolher" | "form">("escolher");
  const [editando, setEditando] = useState<Item | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<Item | null>(null);
  const [excluindoLoading, setExcluindoLoading] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  const { data: rules = [], isLoading: l1, isError: e1 } = useQuery({
    queryKey: ["campaign-rules", companyId],
    enabled: isManager,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_rules").select("*").eq("company_id", companyId).in("type", ["birthday", "recovery"]);
      if (error) throw error;
      return data as Rule[];
    },
  });
  const { data: campaigns = [], isLoading: l2, isError: e2 } = useQuery({
    queryKey: ["campaigns", companyId],
    enabled: isManager,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  if (!isManager) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-semibold mb-1">Campanhas</h1>
        <Card className="mt-6"><CardContent className="p-8 text-center text-sm text-muted-foreground">Só o proprietário ou administrador da empresa acessa esta área.</CardContent></Card>
      </div>
    );
  }

  const itens: Item[] = [
    ...rules.map((rule) => ({ origem: "rule" as const, kind: rule.type as "birthday" | "recovery", rule })),
    ...campaigns.map((campaign) => ({ origem: "campaign" as const, kind: campaign.occasion as CampaignKind, campaign })),
  ];
  const jaTem = (k: CampaignKind) => (k === "birthday" || k === "recovery") && rules.some((r) => r.type === k);

  function abrirNova() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setPasso("escolher");
    setDialogOpen(true);
  }

  function escolher(kind: CampaignKind) {
    const o = OCCASIONS.find((x) => x.key === kind)!;
    const periodo = periodoSugerido(kind);
    setForm({ ...FORM_VAZIO, kind, name: kind === "personalizada" ? "" : o.label, message: o.message, starts_on: periodo?.starts_on ?? "", ends_on: periodo?.ends_on ?? "" });
    setPasso("form");
  }

  function editar(item: Item) {
    setEditando(item);
    if (item.origem === "rule") {
      setForm({ ...FORM_VAZIO, kind: item.kind, name: occasionLabel(item.kind), message: item.rule.message_template ?? "", enabled: item.rule.enabled, dias: String(item.rule.days_threshold ?? 60) });
    } else {
      const c = item.campaign;
      setForm({ ...FORM_VAZIO, kind: item.kind, name: c.name, message: c.message_template ?? "", starts_on: c.starts_on ?? "", ends_on: c.ends_on ?? "", enabled: c.enabled });
    }
    setPasso("form");
    setDialogOpen(true);
  }

  async function salvar() {
    if (salvando) return;
    const isRule = form.kind === "birthday" || form.kind === "recovery";
    if (!isRule && !form.name.trim()) {
      toast({ title: "Dê um nome à campanha", variant: "destructive" });
      return;
    }
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) {
      toast({ title: "A data final não pode ser antes da inicial", variant: "destructive" });
      return;
    }
    setSalvando(true);
    let error;
    if (isRule) {
      ({ error } = await supabase.from("campaign_rules").upsert(
        { company_id: companyId, type: form.kind as "birthday" | "recovery", enabled: form.enabled, days_threshold: form.kind === "recovery" ? Number(form.dias) : 30, message_template: form.message || null },
        { onConflict: "company_id,type" },
      ));
    } else {
      const payload = {
        company_id: companyId,
        occasion: form.kind as Exclude<CampaignKind, "birthday" | "recovery">,
        name: form.name.trim(),
        message_template: form.message || null,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        enabled: form.enabled,
      };
      ({ error } = editando?.origem === "campaign"
        ? await supabase.from("campaigns").update(payload).eq("id", editando.campaign.id)
        : await supabase.from("campaigns").insert(payload));
    }
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao salvar campanha", description: friendlyError(error, "salvar a campanha"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["campaign-rules", companyId] });
    qc.invalidateQueries({ queryKey: ["campaigns", companyId] });
    toast({ title: editando ? "Campanha atualizada" : "Campanha criada" });
    setDialogOpen(false);
    setEditando(null);
  }

  async function alternar(item: Item, enabled: boolean) {
    const { error } = item.origem === "rule"
      ? await supabase.from("campaign_rules").update({ enabled }).eq("id", item.rule.id)
      : await supabase.from("campaigns").update({ enabled }).eq("id", item.campaign.id);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar a campanha"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: [item.origem === "rule" ? "campaign-rules" : "campaigns", companyId] });
    toast({ title: enabled ? "Campanha ativada" : "Campanha desativada" });
  }

  async function excluir() {
    if (!excluindo) return;
    setExcluindoLoading(true);
    const { error } = excluindo.origem === "rule"
      ? await supabase.from("campaign_rules").delete().eq("id", excluindo.rule.id)
      : await supabase.from("campaigns").delete().eq("id", excluindo.campaign.id);
    setExcluindoLoading(false);
    if (error) {
      toast({ title: "Erro ao excluir", description: friendlyError(error, "excluir a campanha"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["campaign-rules", companyId] });
    qc.invalidateQueries({ queryKey: ["campaigns", companyId] });
    toast({ title: "Campanha excluída" });
    setExcluindo(null);
  }

  const isLoading = l1 || l2;
  const isError = e1 || e2;
  const formIsRule = form.kind === "birthday" || form.kind === "recovery";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Aniversário, datas comemorativas e ações personalizadas para os seus clientes</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={abrirNova}><Plus className="w-4 h-4" /> Nova campanha</Button>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>Ativar uma campanha registra a intenção no sistema — ainda não há envio automático (WhatsApp/SMS/e-mail). O contato é manual: abra a campanha, veja os clientes e use o botão do WhatsApp com a mensagem já pronta.</p>
      </div>

      {isLoading ? (
        <LoadingState text="Carregando campanhas..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar suas campanhas." />
      ) : itens.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">Você ainda não criou nenhuma campanha.</p>
            <Button className="gap-2" onClick={abrirNova}><Plus className="w-4 h-4" /> Criar primeira campanha</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {itens.map((item) => {
            const id = item.origem === "rule" ? item.rule.id : item.campaign.id;
            const enabled = item.origem === "rule" ? item.rule.enabled : item.campaign.enabled;
            const status = item.origem === "rule" ? (enabled ? "ativa" : "inativa") : statusDaCampanha(item.campaign);
            const nome = item.origem === "rule" ? occasionLabel(item.kind) : item.campaign.name;
            const mensagem = item.origem === "rule" ? item.rule.message_template : item.campaign.message_template;
            const Icon = item.kind === "birthday" ? Cake : item.kind === "recovery" ? RotateCcw : item.kind === "personalizada" ? Sparkles : CalendarDays;
            const open = aberta === id;
            const st = STATUS_STYLE[status];
            return (
              <Card key={id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{nome}</p>
                        <span className={cn("text-[11px] px-2 py-0.5 rounded-full", st.tone)}>{st.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.origem === "rule"
                          ? item.kind === "birthday" ? "Automática · clientes que fazem aniversário" : `Automática · clientes sem retornar há mais de ${item.rule.days_threshold ?? 60} dias`
                          : `${occasionLabel(item.kind)}${item.campaign.starts_on || item.campaign.ends_on ? ` · ${item.campaign.starts_on ? formatDate(item.campaign.starts_on) : "…"} a ${item.campaign.ends_on ? formatDate(item.campaign.ends_on) : "…"}` : ""}`}
                      </p>
                      {mensagem && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">“{mensagem}”</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={enabled} onCheckedChange={(v) => alternar(item, v)} aria-label="Campanha ativa" />
                      <button onClick={() => editar(item)} title="Editar" aria-label="Editar campanha" className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setExcluindo(item)} title="Excluir" aria-label="Excluir campanha" className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>
                  <button onClick={() => setAberta(open ? null : id)} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1" aria-expanded={open}>
                    Clientes para contatar <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="mt-3 border-t border-border pt-3">
                      {item.kind === "birthday" ? <AniversariantesLista companyId={companyId} mensagem={mensagem ?? ""} />
                        : item.kind === "recovery" ? <RecuperacaoLista companyId={companyId} dias={item.origem === "rule" ? item.rule.days_threshold ?? 60 : 60} mensagem={mensagem ?? ""} />
                        : <ClientesLista companyId={companyId} mensagem={mensagem ?? ""} />}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditando(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {passo === "escolher" ? (
            <>
              <DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground -mt-2">Escolha qual campanha você quer criar.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {OCCASIONS.map((o) => {
                  const bloqueada = jaTem(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      disabled={bloqueada}
                      onClick={() => escolher(o.key)}
                      className="text-left rounded-xl border border-border p-3 hover:bg-muted/60 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <p className="text-sm font-medium">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{bloqueada ? "Você já tem essa campanha — edite na lista" : o.hint}</p>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{editando ? "Editar campanha" : `Nova campanha — ${occasionLabel(form.kind)}`}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {!formIsRule && (
                  <div><Label>Nome da campanha</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Promoção de inverno" /></div>
                )}
                <div>
                  <Label>Mensagem</Label>
                  <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Use {nome} para inserir o nome do cliente" />
                  <p className="text-xs text-muted-foreground mt-1">{"{nome}"} vira o primeiro nome de cada cliente.</p>
                </div>
                {!formIsRule && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Início</Label><Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} /></div>
                    <div><Label>Fim</Label><Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></div>
                  </div>
                )}
                {form.kind === "recovery" && (
                  <div>
                    <Label>Considerar clientes sem retornar há mais de</Label>
                    <Select value={form.dias} onValueChange={(v) => setForm({ ...form, dias: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{[30, 45, 60, 90, 120, 180].map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Campanha ativa</Label>
                  <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                </div>
              </div>
              <DialogFooter className="sm:justify-between">
                {!editando ? <Button variant="outline" className="gap-1.5" onClick={() => setPasso("escolher")}><ArrowLeft className="w-4 h-4" /> Trocar campanha</Button> : <span />}
                <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : editando ? "Salvar" : "Criar campanha"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!excluindo}
        title="Excluir campanha?"
        description={excluindo ? `"${excluindo.origem === "rule" ? occasionLabel(excluindo.kind) : excluindo.campaign.name}" será removida. Essa ação não pode ser desfeita.` : ""}
        loading={excluindoLoading}
        onConfirm={excluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}

function ContatoRow({ nome, phone, mensagem, detalhe }: { nome: string; phone: string | null; mensagem: string; detalhe?: string }) {
  const wa = phone && mensagem ? whatsappLink(phone, mensagem, nome) : null;
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">{nome[0]}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{nome}</p>
          {phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {phone}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {detalhe && <span className="text-xs text-muted-foreground text-right">{detalhe}</span>}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function ListaVazia({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{texto}</p>;
}

function AniversariantesLista({ companyId, mensagem }: { companyId: string; mensagem: string }) {
  const [modo, setModo] = useState<"mes" | "30dias">("mes");
  const supabase = createClient();
  const hoje = new Date();
  const inicio = modo === "mes" ? new Date(hoje.getFullYear(), hoje.getMonth(), 1) : hoje;
  const dias = modo === "mes" ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate() : 30;
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["aniversariantes", companyId, modo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_birthday_candidates_range", { p_company_id: companyId, p_start_date: inicio.toISOString().slice(0, 10), p_days: dias });
      if (error) throw error;
      return data as Aniversariante[];
    },
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">{data.length} aniversariante(s)</p>
        <Select value={modo} onValueChange={(v) => setModo(v as "mes" | "30dias")}>
          <SelectTrigger aria-label="Período de aniversariantes" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="mes">Este mês</SelectItem><SelectItem value="30dias">Próximos 30 dias</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <LoadingState text="Carregando..." /> : isError ? <ErrorState message="Não foi possível carregar os aniversariantes." />
        : data.length === 0 ? <ListaVazia texto="Nenhum aniversariante nesse período." />
        : <div className="divide-y divide-border">{data.map((c) => (
            <ContatoRow key={c.client_id} nome={c.name} phone={c.phone} mensagem={mensagem}
              detalhe={`${formatDate(c.next_birthday)} · ${c.days_until === 0 ? "é hoje!" : c.days_until === 1 ? "amanhã" : `em ${c.days_until} dias`}`} />
          ))}</div>}
    </div>
  );
}

function RecuperacaoLista({ companyId, dias, mensagem }: { companyId: string; dias: number; mensagem: string }) {
  const supabase = createClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["recuperacao", companyId, dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_recovery_candidates", { p_company_id: companyId, p_days_since_last: dias });
      if (error) throw error;
      return data as Recuperacao[];
    },
  });
  return (
    <div>
      <p className="text-sm font-medium mb-1">{data.length} cliente(s) sem retornar há mais de {dias} dias</p>
      {isLoading ? <LoadingState text="Carregando..." /> : isError ? <ErrorState message="Não foi possível carregar a lista." />
        : data.length === 0 ? <ListaVazia texto="Nenhum cliente sumido nesse período — bom sinal." />
        : <div className="divide-y divide-border">{data.map((c) => (
            <ContatoRow key={c.client_id} nome={c.name} phone={c.phone} mensagem={mensagem} detalhe={`último atendimento em ${formatDate(c.last_appointment_at)}`} />
          ))}</div>}
    </div>
  );
}

function ClientesLista({ companyId, mensagem }: { companyId: string; mensagem: string }) {
  const supabase = createClient();
  const [busca, setBusca] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["campanha-clientes", companyId, debounced],
    queryFn: async () => {
      let q = supabase.from("clients").select("id, name, phone").eq("company_id", companyId).eq("active", true).not("phone", "is", null).order("name").limit(50);
      if (debounced) q = q.ilike("name", `%${debounced.replace(/[%,]/g, "")}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as { id: string; name: string; phone: string | null }[];
    },
  });
  return (
    <div>
      <Input placeholder="Buscar cliente pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="mb-1" />
      {isLoading ? <LoadingState text="Carregando..." /> : isError ? <ErrorState message="Não foi possível carregar os clientes." />
        : data.length === 0 ? <ListaVazia texto="Nenhum cliente com telefone encontrado." />
        : <div className="divide-y divide-border">{data.map((c) => <ContatoRow key={c.id} nome={c.name} phone={c.phone} mensagem={mensagem} />)}</div>}
      {data.length === 50 && <p className="text-xs text-muted-foreground mt-2">Mostrando os 50 primeiros — use a busca para achar outros.</p>}
    </div>
  );
}
