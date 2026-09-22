"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, AlertCircle, ArrowLeft, ExternalLink, ShieldCheck, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/query-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

// Reaproveita a MESMA Edge Function `change-subscription-plan` que
// `meu-plano-view.tsx` já usava pra trocar de plano — não existe uma
// segunda lógica de contratação/assinatura aqui. A única mudança do lado
// do backend (fora deste arquivo) foi ensinar essa function a criar a
// primeira assinatura de verdade no Asaas quando a empresa ainda não tem
// `asaas_subscription_id` (self-signup nunca passou por
// admin-create-company), devolvendo `invoice_url` pro checkout. Preço e
// plano SEMPRE são relidos do banco lá dentro — o que este componente
// manda no payload é só o `new_plan_id` (um uuid, não um valor), então não
// há nada aqui pro usuário adulterar via DevTools que mude o que ele paga.

// feature_key -> rótulo em PT-BR. Só as chaves que realmente diferenciam
// plano por plano entram na tabela comparativa. "sms_reminders" existe na
// tabela `plan_features` mas não é um recurso implementado no produto
// (ver comentário em marketing-view.tsx: nenhum canal automático de
// SMS/WhatsApp existe ainda) — por isso fica de fora de qualquer tela
// voltada pro cliente, pra não prometer o que o sistema não entrega.
// "loyalty_program" é o único recurso que ainda vale um check/x genérico
// na tabela comparativa — "anamnesis" ganhou tratamento próprio (ver
// `anamneseLabel` abaixo) porque agora os dois planos TÊM o recurso, só
// com nível de customização diferente (não dá pra representar isso com
// um simples ✓/✗ sem mentir pro usuário).
const FEATURE_LABEL: Record<string, string> = {
  loyalty_program: "Programa de fidelidade",
};
const COMPARISON_FEATURE_KEYS = ["loyalty_program"];

// Recursos que já vêm em todos os planos, sem nenhum gate — confirmados
// contra o código (nenhum destes é checado por `company_has_feature` nem
// por limite numérico: Estoque e Comissão não têm checagem de plano em
// lugar nenhum). Aparecem como uma lista única acima da tabela, não
// repetidos em toda linha/coluna (isso só adicionaria ruído sem comparar
// nada).
const UNIVERSAL_FEATURES = [
  "Agenda online",
  "Gestão de estoque",
  "Gestão financeira",
  "Controle de comissão",
  "Cadastro de clientes",
  "Cadastro de serviços",
  "Página pública de agendamento",
  "Relatórios",
  "Notificações",
];

// Plano "Premium" (renomeado de "Intermediário") é o 2º nível de preço —
// vira o card em destaque ("Mais escolhido"). O Premium antigo (pré-
// reestruturação, migration 093) foi renomeado pra "Premium
// (descontinuado)" no banco pra não colidir com este nome — o componente
// já lê só os planos `active=true`, então aquele nunca aparece aqui sem
// precisar de nenhum filtro extra neste arquivo.
const HIGHLIGHT_PLAN_NAME = "Premium";
const PLAN_TAGLINE: Record<string, string> = {
  Básico: "Pra quem está começando",
  Premium: "Pra negócios em crescimento",
};

function limitLabel(n: number | null): string {
  return n === null ? "Ilimitado" : String(n);
}

// "Ficha de anamnese" não é mais um simples check/x — os dois planos têm
// o recurso (migration 093), a diferença é se dá pra customizar as
// perguntas ou não (`anamnesis_customizable`, aplicado de verdade por
// trigger no banco — ver `enforce_anamnesis_customization`). Retorna
// `null` quando o plano nem tem anamnese (não é o caso de nenhum plano
// ativo hoje, mas mantém o componente correto se isso mudar).
function anamneseNivel(planFeatures: Tables<"plan_features">[]): "padrão" | "personalizável" | null {
  const has = planFeatures.find((f) => f.feature_key === "anamnesis")?.enabled ?? false;
  if (!has) return null;
  const customizavel = planFeatures.find((f) => f.feature_key === "anamnesis_customizable")?.enabled ?? false;
  return customizavel ? "personalizável" : "padrão";
}
function anamneseLabel(planFeatures: Tables<"plan_features">[]): string | null {
  const nivel = anamneseNivel(planFeatures);
  return nivel ? `Ficha de anamnese (${nivel})` : null;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

// Preço com hierarquia tipográfica própria — "R$" pequeno, valor em
// destaque, "/mês" secundário — em vez de um texto único do mesmo
// tamanho. `toLocaleString` sozinho (como o resto do app usa via
// `formatCurrency`) devolve "R$ 59,90" como uma string só; aqui cada parte
// vira um `<span>` de tamanho diferente de propósito.
function PlanPrice({ cents, interval, size = "card" }: { cents: number; interval: string; size?: "card" | "resumo" }) {
  const value = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <p className={cn("font-heading font-semibold flex items-baseline gap-1", size === "resumo" ? "text-4xl" : "text-3xl")}>
      <span className="text-sm font-medium text-muted-foreground self-start">R$</span>
      <span>{value}</span>
      <span className="text-sm font-normal text-muted-foreground">/{interval === "yearly" ? "ano" : "mês"}</span>
    </p>
  );
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Promoção de lançamento (migration 095): preço normal riscado + preço
// promocional em destaque + nota explicando a duração. Só aparece quando
// `precoPromoCents` é diferente do preço cheio do plano — o cálculo de
// elegibilidade (`precoEfetivoCents`, dentro do componente) já decide
// isso, este componente só desenha o que recebe.
function PlanPriceComPromo({
  precoNormalCents,
  precoPromoCents,
  interval,
  size = "card",
}: {
  precoNormalCents: number;
  precoPromoCents: number;
  interval: string;
  size?: "card" | "resumo";
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs text-muted-foreground line-through">{formatCents(precoNormalCents)}</span>
        <span className="text-[11px] font-medium text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded">Preço de lançamento</span>
      </div>
      <PlanPrice cents={precoPromoCents} interval={interval} size={size} />
      <p className="text-xs text-muted-foreground mt-0.5">
        nos 6 primeiros meses — depois, {formatCents(precoNormalCents)}/mês
      </p>
    </div>
  );
}

// Placeholder de carregamento pros cards — usado quando um "Tentar
// novamente" (depois de um erro ao carregar os planos) está em voo.
// `aria-hidden` porque é só decoração; o texto real pra leitor de tela
// (`role="status"`) fica num nó separado, escondido visualmente.
function PlansSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-4" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border p-5 sm:p-6 animate-pulse space-y-3">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-8 w-28 bg-muted rounded mt-2" />
          <div className="space-y-2 pt-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-3 w-full bg-muted rounded" />
            ))}
          </div>
          <div className="h-10 w-full bg-muted rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

type FunctionErrorBody = { error?: string; reason?: string; exceeded?: string[] };

type View =
  | { kind: "cards" }
  | { kind: "summary"; plan: Tables<"plans"> }
  | { kind: "awaiting_payment"; plan: Tables<"plans">; invoiceUrl: string }
  | { kind: "success"; plan: Tables<"plans"> };

export function PlanPicker({
  plans,
  plansError,
  allFeatures,
  company,
  currentPlanId,
  subscriptionStatus,
  promoEndsAt = null,
  context = "upgrade",
}: {
  plans: Tables<"plans">[];
  plansError?: boolean;
  allFeatures: Tables<"plan_features">[];
  company: Tables<"companies">;
  currentPlanId: string | null;
  subscriptionStatus: string | null;
  /** `subscriptions.promo_ends_at` atual — null se esta empresa nunca entrou na promoção de lançamento. */
  promoEndsAt?: string | null;
  /**
   * Muda só a mensagem da tela de sucesso ("acesso liberado" na tela de
   * bloqueio vs. "plano atualizado" em Meu plano). String simples (não
   * função) de propósito — este componente é montado a partir de um
   * server component (`access-blocked-screen.tsx`), e props de Server
   * pra Client Component precisam ser serializáveis.
   */
  context?: "blocked" | "upgrade";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isRetrying, startRetry] = useTransition();

  const [view, setView] = useState<View>({ kind: "cards" });
  const [documentInput, setDocumentInput] = useState(company.document ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | string[] | null>(null);
  const [documentErrorMsg, setDocumentErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  // Enquanto esperamos a confirmação do pagamento (webhook do Asaas
  // atualiza `subscriptions` de forma assíncrona), fica reconsultando o
  // servidor. `router.refresh()` refaz os componentes de servidor desta
  // rota (inclusive o layout, no caso da tela de bloqueio) — quando o
  // acesso for liberado, a própria árvore de componentes já muda sozinha.
  useEffect(() => {
    if (view.kind !== "awaiting_payment") {
      if (pollRef.current) clearInterval(pollRef.current);
      pollAttemptsRef.current = 0;
      return;
    }
    pollRef.current = setInterval(() => {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > 20) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      router.refresh();
    }, 6000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind]);

  // Detecta a confirmação assim que os props chegam atualizados (via o
  // refresh acima, ou o usuário clicando "Já paguei, verificar").
  useEffect(() => {
    if (view.kind === "awaiting_payment" && subscriptionStatus === "active" && currentPlanId === view.plan.id) {
      setView({ kind: "success", plan: view.plan });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionStatus, currentPlanId]);

  if (plansError || plans.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <span className="sr-only" role="status">
            {isRetrying ? "Carregando planos..." : "Não foi possível carregar os planos."}
          </span>
          {isRetrying ? (
            <PlansSkeleton />
          ) : (
            <>
              <ErrorState message="Não foi possível carregar os planos. Tente novamente." />
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => startRetry(() => router.refresh())}>
                  Tentar novamente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Espelha (só pra exibição — o servidor sempre recalcula e manda a
  // palavra final) a mesma regra de elegibilidade do
  // `change-subscription-plan`: segue na janela original (6 meses do 1º
  // pagamento) se ainda não passou, ou entra na promoção agora se nunca
  // esteve nela e a empresa está contratando de verdade (não é troca de
  // plano de quem já paga).
  function precoEfetivoCents(plan: Tables<"plans">): number {
    if (!plan.promo_active || plan.promo_price_cents === null) return plan.price_cents;
    const aindaNaJanela = promoEndsAt !== null && new Date(promoEndsAt) > new Date();
    const nuncaTevePromo = promoEndsAt === null;
    const contratandoDeNovo = subscriptionStatus !== "active";
    if (aindaNaJanela || (nuncaTevePromo && contratandoDeNovo)) return plan.promo_price_cents;
    return plan.price_cents;
  }

  function abrirResumo(plan: Tables<"plans">) {
    setErrorMsg(null);
    setDocumentErrorMsg(null);
    setView({ kind: "summary", plan });
  }

  async function contratar(plan: Tables<"plans">) {
    setErrorMsg(null);
    setDocumentErrorMsg(null);

    const precisaDocumento = !company.document;
    let documentoLimpo: string | undefined;
    if (precisaDocumento) {
      documentoLimpo = onlyDigits(documentInput);
      if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
        setDocumentErrorMsg("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        return;
      }
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("change-subscription-plan", {
      body: { new_plan_id: plan.id, ...(documentoLimpo ? { document: documentoLimpo } : {}) },
    });
    setSubmitting(false);

    if (error) {
      const context = (error as { context?: { json?: () => Promise<FunctionErrorBody> } }).context;
      const body = await context?.json?.().catch(() => null);
      if (body?.reason === "already_active") {
        setErrorMsg("Você já está neste plano.");
        return;
      }
      if (body?.reason === "missing_document" || body?.reason === "invalid_document") {
        setDocumentErrorMsg("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        return;
      }
      if (body?.exceeded && body.exceeded.length > 0) {
        setErrorMsg(body.exceeded);
        return;
      }
      setErrorMsg(body?.error || "Não foi possível concluir a contratação agora. Tente novamente em instantes.");
      return;
    }

    const invoiceUrl: string | null = data?.invoice_url ?? null;
    if (invoiceUrl) {
      setView({ kind: "awaiting_payment", plan, invoiceUrl });
      window.open(invoiceUrl, "_blank", "noopener,noreferrer");
    } else {
      setView({ kind: "success", plan });
      router.refresh();
    }
  }

  // ---------- Tela de sucesso ----------
  if (view.kind === "success") {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-chart-2/15 flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-7 h-7 text-chart-2" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-xl font-semibold mb-1">Pagamento confirmado</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {context === "blocked"
              ? `Seu plano ${view.plan.name} está ativo — o acesso ao Impegni foi liberado.`
              : `Agora você está no plano ${view.plan.name}.`}
          </p>
          <Button onClick={() => router.refresh()}>Continuar</Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Aguardando confirmação do pagamento ----------
  if (view.kind === "awaiting_payment") {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-chart-4/15 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-chart-4 animate-spin" aria-hidden="true" />
          </div>
          <h2 className="font-heading text-xl font-semibold mb-1">Aguardando confirmação do pagamento</h2>
          <p className="text-sm text-muted-foreground mb-6" role="status">
            Abrimos a página de pagamento do plano {view.plan.name} em outra aba. Assim que o pagamento for confirmado, a liberação acontece automaticamente aqui — não precisa fazer mais nada.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" className="gap-2" onClick={() => window.open(view.invoiceUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="w-4 h-4" aria-hidden="true" /> Abrir página de pagamento novamente
            </Button>
            <Button onClick={() => router.refresh()}>Já paguei, verificar</Button>
          </div>
          <Button variant="link" size="sm" className="mt-2" onClick={() => setView({ kind: "cards" })}>
            Cancelar e voltar aos planos
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- Resumo da contratação ----------
  if (view.kind === "summary") {
    const { plan } = view;
    const planFeatures = allFeatures.filter((f) => f.plan_id === plan.id);
    const anamneseTxt = anamneseLabel(planFeatures);
    const beneficios = [
      ...UNIVERSAL_FEATURES,
      ...(anamneseTxt ? [anamneseTxt] : []),
      ...planFeatures.filter((f) => f.enabled && COMPARISON_FEATURE_KEYS.includes(f.feature_key)).map((f) => FEATURE_LABEL[f.feature_key] ?? f.feature_key),
    ];
    const jaAtivoNoPlano = plan.id === currentPlanId && subscriptionStatus === "active";

    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="p-6 sm:p-8">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 mb-4" onClick={() => setView({ kind: "cards" })}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <p className="text-xs text-muted-foreground mb-1">Você está contratando</p>
          <h2 className="font-heading text-2xl font-semibold mb-1">{plan.name}</h2>
          <div className="mb-1">
            {precoEfetivoCents(plan) < plan.price_cents ? (
              <PlanPriceComPromo precoNormalCents={plan.price_cents} precoPromoCents={precoEfetivoCents(plan)} interval={plan.billing_interval} size="resumo" />
            ) : (
              <PlanPrice cents={plan.price_cents} interval={plan.billing_interval} size="resumo" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-5 mt-1">Cobrança recorrente mensal, via Asaas. Cancele quando quiser.</p>

          <div className="rounded-lg border border-border p-4 mb-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">O que está incluso</p>
            <ul className="space-y-1.5">
              {beneficios.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Incluído: </span> {b}
                </li>
              ))}
            </ul>
          </div>

          {!company.document && (
            <div className="mb-5">
              <Label htmlFor="doc-contratacao">CPF ou CNPJ</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Necessário pra emitir a cobrança no Asaas.</p>
              <Input
                id="doc-contratacao"
                inputMode="numeric"
                placeholder="Somente números"
                value={documentInput}
                onChange={(e) => setDocumentInput(onlyDigits(e.target.value).slice(0, 14))}
                maxLength={14}
                aria-invalid={!!documentErrorMsg}
              />
              {documentErrorMsg && <p className="text-xs text-destructive mt-1">{documentErrorMsg}</p>}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex gap-2 mb-5" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                {Array.isArray(errorMsg) ? (
                  <>
                    <p className="font-medium mb-1">Seu uso atual excede o limite deste plano:</p>
                    <ul className="list-disc list-inside space-y-0.5">{errorMsg.map((e) => <li key={e}>{e}</li>)}</ul>
                  </>
                ) : (
                  errorMsg
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setView({ kind: "cards" })} disabled={submitting} className="sm:order-1">
              Voltar
            </Button>
            <Button onClick={() => contratar(plan)} disabled={submitting || jaAtivoNoPlano} className="flex-1 sm:order-2">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Processando pagamento...</>
              ) : jaAtivoNoPlano ? (
                "Você já está neste plano"
              ) : (
                "Continuar para pagamento"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> Pagamento processado com segurança pelo Asaas.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---------- Cards + tabela comparativa ----------
  const orderedPlans = [...plans].sort((a, b) => a.price_cents - b.price_cents);

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {orderedPlans.map((plan) => {
          const planFeatures = allFeatures.filter((f) => f.plan_id === plan.id);
          const anamneseTxt = anamneseLabel(planFeatures);
          const loyalty = planFeatures.find((f) => f.feature_key === "loyalty_program")?.enabled ?? false;
          const destaque = plan.name === HIGHLIGHT_PLAN_NAME;
          const ehAtual = plan.id === currentPlanId;
          const ativoNoPlano = ehAtual && subscriptionStatus === "active";

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-shadow duration-200",
                destaque ? "border-primary shadow-md sm:-translate-y-1 hover:shadow-lg" : "hover:shadow-md"
              )}
            >
              {destaque && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                  Mais escolhido
                </div>
              )}
              <CardContent className="p-5 sm:p-6 flex flex-col flex-1 pt-7">
                {ativoNoPlano && (
                  <span className="self-start text-xs font-medium text-chart-2 bg-chart-2/10 px-2 py-0.5 rounded-full mb-2">Plano atual</span>
                )}
                <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{PLAN_TAGLINE[plan.name] ?? ""}</p>
                <div className="mb-4">
                  {precoEfetivoCents(plan) < plan.price_cents ? (
                    <PlanPriceComPromo precoNormalCents={plan.price_cents} precoPromoCents={precoEfetivoCents(plan)} interval={plan.billing_interval} />
                  ) : (
                    <PlanPrice cents={plan.price_cents} interval={plan.billing_interval} />
                  )}
                </div>

                <ul className="space-y-2 text-sm mb-5 flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" />
                    {limitLabel(plan.max_professionals)} {plan.max_professionals === 1 ? "profissional" : "profissionais"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" /> {limitLabel(plan.max_clients)} clientes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" /> {limitLabel(plan.max_appointments)} agendamentos/mês
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" /> {limitLabel(plan.max_users)} usuário{plan.max_users === 1 ? "" : "s"} da equipe
                  </li>
                  <li className={cn("flex items-center gap-2", !anamneseTxt && "text-muted-foreground")}>
                    {anamneseTxt ? <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    <span className="sr-only">{anamneseTxt ? "Incluído: " : "Não incluído: "}</span> {anamneseTxt ?? "Ficha de anamnese"}
                  </li>
                  <li className={cn("flex items-center gap-2", !loyalty && "text-muted-foreground")}>
                    {loyalty ? <Check className="w-4 h-4 text-chart-2 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    <span className="sr-only">{loyalty ? "Incluído: " : "Não incluído: "}</span> Programa de fidelidade
                  </li>
                </ul>

                {ativoNoPlano ? (
                  <Button variant="outline" disabled className="w-full">Seu plano atual</Button>
                ) : (
                  <Button variant={destaque ? "default" : "outline"} className="w-full" onClick={() => abrirResumo(plan)}>
                    Escolher {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground w-full text-center sm:w-auto sm:font-normal sm:text-muted-foreground">Incluído em todos os planos:</span>
        {UNIVERSAL_FEATURES.map((f) => (
          <span key={f} className="flex items-center gap-1">
            <Check className="w-3 h-3 text-chart-2" aria-hidden="true" /> {f}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-sm border-collapse min-w-[420px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground py-2 pr-2">Comparar planos</th>
              {orderedPlans.map((p) => (
                <th key={p.id} className="text-center font-medium py-2 px-2">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-border/60 last:[&>tr]:border-0">
            <tr>
              <td className="py-2 pr-2 text-muted-foreground">Profissionais</td>
              {orderedPlans.map((p) => <td key={p.id} className="text-center py-2 px-2 font-medium tabular-nums">{limitLabel(p.max_professionals)}</td>)}
            </tr>
            <tr>
              <td className="py-2 pr-2 text-muted-foreground">Clientes</td>
              {orderedPlans.map((p) => <td key={p.id} className="text-center py-2 px-2 font-medium tabular-nums">{limitLabel(p.max_clients)}</td>)}
            </tr>
            <tr>
              <td className="py-2 pr-2 text-muted-foreground">Agendamentos/mês</td>
              {orderedPlans.map((p) => <td key={p.id} className="text-center py-2 px-2 font-medium tabular-nums">{limitLabel(p.max_appointments)}</td>)}
            </tr>
            <tr>
              <td className="py-2 pr-2 text-muted-foreground">Usuários da equipe</td>
              {orderedPlans.map((p) => <td key={p.id} className="text-center py-2 px-2 font-medium tabular-nums">{limitLabel(p.max_users)}</td>)}
            </tr>
            <tr>
              <td className="py-2 pr-2 text-muted-foreground">Ficha de anamnese</td>
              {orderedPlans.map((p) => {
                const nivel = anamneseNivel(allFeatures.filter((f) => f.plan_id === p.id));
                return (
                  <td key={p.id} className="text-center py-2 px-2 font-medium capitalize">
                    {nivel ?? <X className="w-4 h-4 text-muted-foreground/50 inline" aria-hidden="true" />}
                  </td>
                );
              })}
            </tr>
            {COMPARISON_FEATURE_KEYS.map((key) => (
              <tr key={key}>
                <td className="py-2 pr-2 text-muted-foreground">{FEATURE_LABEL[key]}</td>
                {orderedPlans.map((p) => {
                  const enabled = allFeatures.find((f) => f.plan_id === p.id && f.feature_key === key)?.enabled ?? false;
                  return (
                    <td key={p.id} className="text-center py-2 px-2">
                      {enabled ? (
                        <Check className="w-4 h-4 text-chart-2 inline" aria-hidden="true" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 inline" aria-hidden="true" />
                      )}
                      <span className="sr-only">{enabled ? "Incluído" : "Não incluído"}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
