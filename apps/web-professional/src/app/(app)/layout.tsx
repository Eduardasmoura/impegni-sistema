import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { getCurrentProfile } from "@/lib/profile";
import { getCurrentSubscription } from "@/lib/subscription";
import { getCompanyPlanLimits, planAllowsTeam } from "@/lib/plan-limits";
import { getCompanyAccessStatus } from "@/lib/access";
import { companyBrandStyle } from "@/lib/color";
import { SidebarNav } from "@/components/sidebar-nav";
import { AccessBlockedScreen } from "@/components/access-blocked-screen";

// AccessBlockedScreen (Escolha de plano na tela de bloqueio) precisa do
// registro completo de `companies` (document/asaas_customer_id/email/
// whatsapp — tudo que PlanPicker usa pra saber se falta CPF/CNPJ e como
// chamar o Asaas) e não só do nome. `getCurrentCompany()` já traz a linha
// inteira via `companies(*)`, então isso não é uma consulta nova.

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // FASE 1 (auditoria) — ponto único de bloqueio por assinatura/status da
  // empresa. Cobre toda rota autenticada de uma vez (nada dentro de
  // `(app)` precisa checar isso de novo) — ver `lib/access.ts` pra por que
  // isto fica aqui e não duplicado no middleware.
  const access = await getCompanyAccessStatus(current.company.id);
  if (access && !access.allowed) {
    const isManager = current.roleEmpresa === "owner" || current.roleEmpresa === "admin";
    const [{ data: plans, error: plansError }, { data: allFeatures }, subscription] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("price_cents"),
      supabase.from("plan_features").select("*"),
      getCurrentSubscription(),
    ]);
    return (
      <AccessBlockedScreen
        access={access}
        company={current.company}
        isManager={isManager}
        plans={plans ?? []}
        plansError={!!plansError}
        allFeatures={allFeatures ?? []}
        currentPlanId={subscription?.plan_id ?? null}
        promoEndsAt={subscription?.promo_ends_at ?? null}
      />
    );
  }

  const [profile, subscription, planLimits, { count: professionalsCount }] = await Promise.all([
    getCurrentProfile(),
    getCurrentSubscription(),
    getCompanyPlanLimits(),
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
  ]);

  // Aplica a paleta customizável da empresa (Meu negócio > cores) de
  // verdade pela primeira vez — antes ficava só salva no banco (ver
  // `lib/color.ts`). Empresas que nunca mexeram nessas cores (campos
  // `null`) continuam exatamente com o tema estático de sempre.
  const brandStyle = companyBrandStyle(current.company);

  return (
    <div className="min-h-screen bg-background lg:flex" style={brandStyle as React.CSSProperties}>
      <SidebarNav
        companyName={current.company.name}
        userEmail={user.email}
        fullName={profile?.full_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        planName={subscription?.plans?.name ?? null}
        showEquipe={planAllowsTeam(planLimits, professionalsCount ?? 0)}
        isManager={current.roleEmpresa === "owner" || current.roleEmpresa === "admin"}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
