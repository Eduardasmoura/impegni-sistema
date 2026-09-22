"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { CreditCard, Check, X, Clock, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { ASSINATURA_STATUS_LABEL } from "@/lib/labels";
import type { CurrentSubscription } from "@/lib/subscription";
import type { Tables } from "@/lib/supabase/database.types";
import { PlanPicker } from "@/components/plan-picker";

const STATUS_COLOR: Record<string, string> = {
  trial: "bg-chart-4/15 text-chart-4",
  active: "bg-chart-2/15 text-chart-2",
  past_due: "bg-chart-4/15 text-chart-4",
  suspended: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
};

// feature_key -> rótulo em PT-BR; chave desconhecida cai no fallback (mostra
// a própria chave), pra não quebrar se um novo recurso for cadastrado no
// Super Admin sem uma tradução aqui ainda.
//
// "sms_reminders" existe na tabela `plan_features` (cadastrada no Super
// Admin) mas não é um recurso que o produto realmente entrega — não há
// nenhum canal automático de SMS/WhatsApp implementado (ver
// marketing-view.tsx). Por isso é filtrada antes de chegar aqui (não
// aparece pro cliente como "incluído"), na mesma linha do que a tela de
// planos faz: nunca mostrar como disponível algo que o sistema não tem.
const FEATURE_LABEL: Record<string, string> = {
  anamnesis: "Ficha de anamnese",
  loyalty_program: "Programa de fidelidade",
};

export function MeuPlanoView({
  isManager,
  company,
  subscription,
  features,
  allFeatures,
  plans,
  plansError,
  usage,
}: {
  isManager: boolean;
  company: Tables<"companies">;
  subscription: CurrentSubscription | null;
  features: Tables<"plan_features">[];
  allFeatures: Tables<"plan_features">[];
  plans: Tables<"plans">[];
  plansError: boolean;
  usage: { users: number; professionals: number; clients: number; appointments: number };
}) {
  if (!subscription) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl font-semibold mb-1">Meu plano</h1>
        <Card className="mt-6">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {isManager
              ? "Nenhuma assinatura encontrada para esta empresa ainda."
              : "Só o proprietário ou administrador da empresa pode ver os detalhes do plano."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = subscription.plans;
  const visibleFeatures = features.filter((f) => f.feature_key !== "sms_reminders");
  const diasRestantesTrial = subscription.trial_ends_at ? differenceInCalendarDays(new Date(subscription.trial_ends_at), new Date()) : null;

  const limites: { label: string; atual: number; max: number | null }[] = [
    { label: "Usuários", atual: usage.users, max: plan?.max_users ?? null },
    { label: "Profissionais", atual: usage.professionals, max: plan?.max_professionals ?? null },
    { label: "Clientes", atual: usage.clients, max: plan?.max_clients ?? null },
    { label: "Agendamentos (mês)", atual: usage.appointments, max: plan?.max_appointments ?? null },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="max-w-2xl mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Meu plano</h1>
      <p className="text-sm text-muted-foreground mb-6">Detalhes do seu plano atual e do uso da sua conta.</p>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plano atual</p>
                <h2 className="font-heading text-2xl font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> {plan?.name ?? "—"}
                </h2>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[subscription.status] ?? ""}`}>
                {ASSINATURA_STATUS_LABEL[subscription.status] ?? subscription.status}
              </span>
            </div>

            {plan && (
              <p className="text-3xl font-heading font-semibold mb-4">
                {formatCurrency(plan.price_cents / 100)}
                <span className="text-sm font-normal text-muted-foreground"> / {plan.billing_interval === "yearly" ? "ano" : "mês"}</span>
              </p>
            )}

            {subscription.status === "trial" && diasRestantesTrial !== null && (
              <div className="flex items-center gap-2 text-sm bg-chart-4/10 text-chart-4 rounded-lg px-3 py-2 mb-3">
                <Clock className="w-4 h-4 shrink-0" />
                {diasRestantesTrial > 0
                  ? `Período de teste — faltam ${diasRestantesTrial} dia${diasRestantesTrial === 1 ? "" : "s"}.`
                  : "Seu período de teste terminou."}
              </div>
            )}

            {subscription.current_period_end && (
              <p className="text-sm text-muted-foreground">Próxima cobrança em {formatDate(subscription.current_period_end)}</p>
            )}
            {subscription.canceled_at && (
              <p className="text-sm text-muted-foreground">Cancelada em {formatDate(subscription.canceled_at)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Uso do plano</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {limites.map(({ label, atual, max }) => {
              const pct = max ? Math.min(100, Math.round((atual / max) * 100)) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{atual} / {max ?? "∞"}</span>
                  </div>
                  {max !== null && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recursos incluídos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {visibleFeatures.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum recurso adicional cadastrado para este plano.</p>}
            {visibleFeatures.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm py-1">
                <span className="flex items-center gap-2">
                  {f.enabled ? <Check className="w-4 h-4 text-chart-2" /> : <X className="w-4 h-4 text-muted-foreground" />}
                  {FEATURE_LABEL[f.feature_key] ?? f.feature_key}
                </span>
                {f.enabled && f.limit_value !== null && <span className="text-xs text-muted-foreground">até {f.limit_value}</span>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Quer cancelar ou tirar dúvidas sobre cobrança?</p>
            <Link href="mailto:atendimento.inovabi@gmail.com" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0">
              <Mail className="w-4 h-4" /> Fale com o suporte
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>

      {isManager && (
        <div className="mt-10">
          <h2 className="font-heading text-2xl font-semibold mb-1 text-center">Escolha o plano ideal para o seu negócio</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            Tenha tudo o que precisa para organizar seus atendimentos, clientes e gestão em um só lugar.
          </p>
          <PlanPicker
            plans={plans}
            plansError={plansError}
            allFeatures={allFeatures}
            company={company}
            currentPlanId={plan?.id ?? null}
            subscriptionStatus={subscription.status}
            promoEndsAt={subscription.promo_ends_at}
            context="upgrade"
          />
        </div>
      )}
    </div>
  );
}
