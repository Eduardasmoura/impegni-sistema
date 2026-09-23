import { Check, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { REGISTER_URL } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const TAGLINE: Record<string, string> = {
  Básico: "Pra quem está começando",
  Premium: "Pra negócios em crescimento",
};

const UNIVERSAL_FEATURES = [
  "Agenda online",
  "Página pública de agendamento",
  "Gestão de clientes",
  "Controle financeiro",
  "Controle de estoque",
  "Controle de comissão",
  "Cadastro de serviços",
  "Relatórios",
  "Notificações",
];

function limitLabel(value: number | null): string {
  return value === null ? "Ilimitado" : String(value);
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function anamneseNivel(planFeatures: Tables<"plan_features">[]): "padrão" | "personalizável" | null {
  const habilitada = planFeatures.find((f) => f.feature_key === "anamnesis")?.enabled ?? false;
  if (!habilitada) return null;
  const personalizavel = planFeatures.find((f) => f.feature_key === "anamnesis_customizable")?.enabled ?? false;
  return personalizavel ? "personalizável" : "padrão";
}

function Price({ cents }: { cents: number }) {
  const value = (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <p className="font-heading font-semibold flex items-baseline gap-1 text-[2.4rem] leading-none tracking-[-0.03em]">
      <span className="text-[15px] font-medium text-muted-foreground self-start mt-1 tracking-normal">R$</span>
      <span>{value}</span>
      <span className="text-[15px] font-normal text-muted-foreground tracking-normal">/mês</span>
    </p>
  );
}

interface PlanCardProps {
  plan: Tables<"plans">;
  planFeatures: Tables<"plan_features">[];
  previousPlan: Tables<"plans"> | null;
  previousPlanFeatures: Tables<"plan_features">[];
  highlighted: boolean;
}

// Preço e recurso vêm direto do banco (mesma tabela pública lida por
// apps/web-professional/.../plan-picker.tsx) — nada hardcoded aqui além dos
// nomes de recursos universais, que o banco não guarda como catálogo de
// texto. Quando o preço promocional mudar (`plans.promo_active`), este card
// reflete sozinho, sem novo deploy.
export function PlanCard({ plan, planFeatures, previousPlan, previousPlanFeatures, highlighted }: PlanCardProps) {
  const nivel = anamneseNivel(planFeatures);
  const nivelAnterior = previousPlan ? anamneseNivel(previousPlanFeatures) : null;

  const fidelidade = planFeatures.find((f) => f.feature_key === "loyalty_program")?.enabled ?? false;
  const fidelidadeAnterior = previousPlan ? previousPlanFeatures.find((f) => f.feature_key === "loyalty_program")?.enabled ?? false : false;

  const temPromo = plan.promo_active && plan.promo_price_cents !== null;
  const economiaAnualCents = temPromo ? (plan.price_cents - plan.promo_price_cents!) * 12 : 0;

  // Primeiro plano (mais barato) mostra a lista completa; os demais mostram
  // só o que acrescentam em cima do anterior — tabela de comparação em
  // degraus, sem repetir os recursos universais em cada card.
  const recursosLabel = previousPlan ? `Tudo do ${previousPlan.name}, além de:` : "Principais recursos";

  return (
    <div
      className={`relative rounded-2xl border bg-card p-7 sm:p-9 flex flex-col ${
        highlighted
          ? "order-1 md:order-none border-primary/60 shadow-product ring-1 ring-primary/10"
          : "order-2 md:order-none border-foreground/10"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-7 sm:left-9 bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
          Mais popular
        </span>
      )}

      <h3 className="font-heading text-xl font-semibold tracking-tight">{plan.name}</h3>
      <p className="text-[15px] text-muted-foreground mt-1 mb-6">{TAGLINE[plan.name] ?? ""}</p>

      {temPromo && (
        <span className="inline-flex self-start items-center text-xs font-semibold text-primary bg-accent px-2.5 py-1 rounded-md mb-3">
          Economize {formatCents(economiaAnualCents)}/ano
        </span>
      )}

      {temPromo ? (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-muted-foreground line-through">{formatCents(plan.price_cents)}</span>
            <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Preço de lançamento</span>
          </div>
          <Price cents={plan.promo_price_cents!} />
          <p className="text-xs text-muted-foreground mt-1">nos 6 primeiros meses — depois, {formatCents(plan.price_cents)}/mês</p>
        </div>
      ) : (
        <Price cents={plan.price_cents} />
      )}

      <ButtonLink
        href={REGISTER_URL}
        variant={highlighted ? "primary" : "outline"}
        size="lg"
        className="mt-7 w-full"
      >
        Começar grátis
      </ButtonLink>
      <p className="mt-3 text-center text-[13px] text-muted-foreground">14 dias grátis • Sem cartão de crédito</p>

      <div className="mt-8 pt-7 border-t border-foreground/[0.08] flex-1">
        <p className="text-[13px] font-semibold text-foreground/70 mb-4">{recursosLabel}</p>
        <ul className="space-y-3 text-[15px]">
          {!previousPlan && (
            <>
              {UNIVERSAL_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  {feature}
                </li>
              ))}
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                {limitLabel(plan.max_professionals)} {plan.max_professionals === 1 ? "profissional" : "profissionais"}
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                {limitLabel(plan.max_clients)} clientes
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                {limitLabel(plan.max_appointments)} agendamentos/mês
              </li>
            </>
          )}

          {previousPlan && (
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              {limitLabel(plan.max_professionals)} {plan.max_professionals === 1 ? "profissional" : "profissionais"}
            </li>
          )}
          {previousPlan && plan.max_clients !== previousPlan.max_clients && (
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              {plan.max_clients === null ? "Clientes ilimitados" : `${plan.max_clients} clientes`}
            </li>
          )}
          {previousPlan && plan.max_appointments !== previousPlan.max_appointments && (
            <li className="flex items-center gap-3">
              <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              {plan.max_appointments === null ? "Agendamentos ilimitados" : `${plan.max_appointments} agendamentos/mês`}
            </li>
          )}

          {(!previousPlan || nivel !== nivelAnterior) && (
            <li className={`flex items-center gap-3 ${!nivel ? "text-muted-foreground" : ""}`}>
              {nivel ? <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
              {nivel ? `Ficha de anamnese (${nivel})` : "Ficha de anamnese"}
            </li>
          )}
          {(!previousPlan || fidelidade !== fidelidadeAnterior) && (
            <li className={`flex items-center gap-3 ${!fidelidade ? "text-muted-foreground" : ""}`}>
              {fidelidade ? <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
              Programa de fidelidade
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
