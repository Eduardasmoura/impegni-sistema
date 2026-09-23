import { SectionHeading } from "@/components/ui/section-heading";
import { createClient } from "@/lib/supabase/server";
import { PlanCard } from "./plan-card";

const HIGHLIGHT_PLAN_NAME = "Premium";

export async function Planos() {
  const supabase = createClient();
  const [{ data: plans, error }, { data: allFeatures }] = await Promise.all([
    supabase.from("plans").select("*").eq("active", true).order("price_cents"),
    supabase.from("plan_features").select("*"),
  ]);

  if (error || !plans || plans.length === 0) {
    return (
      <section id="planos" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="rounded-2xl border border-foreground/10 bg-card p-10 text-center text-muted-foreground">
          Não foi possível carregar os planos agora. Atualize a página em instantes.
        </div>
      </section>
    );
  }

  return (
    <section id="planos" aria-labelledby="planos-title" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
      <SectionHeading
        id="planos-title"
        eyebrow="Planos"
        title="Planos simples. Sem surpresa."
        description="Teste grátis por 14 dias em qualquer plano, sem cartão de crédito. Depois, escolha o que acompanha o seu negócio."
      />

      {/* items-start, não stretch: o Premium lista menos recursos (só o que
          acrescenta sobre o Básico) e forçar a mesma altura deixava um vazio
          no fim do card — cada um assume sua altura de conteúdo. */}
      <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto items-start">
        {plans.map((plan, i) => {
          const previousPlan = i > 0 ? plans[i - 1] : null;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              planFeatures={(allFeatures ?? []).filter((f) => f.plan_id === plan.id)}
              previousPlan={previousPlan}
              previousPlanFeatures={previousPlan ? (allFeatures ?? []).filter((f) => f.plan_id === previousPlan.id) : []}
              highlighted={plan.name === HIGHLIGHT_PLAN_NAME}
            />
          );
        })}
      </div>
    </section>
  );
}
