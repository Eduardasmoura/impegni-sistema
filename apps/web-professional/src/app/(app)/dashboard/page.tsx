import { getCurrentCompany } from "@/lib/company";
import { getCurrentProfile } from "@/lib/profile";
import { getCurrentSubscription } from "@/lib/subscription";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardView } from "./dashboard-view";
import { WelcomeToast } from "@/components/welcome-toast";
import type { SetupProgress } from "@/components/setup-guide";

export default async function DashboardPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const [{ count: servicesCount }, { count: professionalsCount }, { count: clientsCount }, { count: appointmentsCount }, profile, subscription] = await Promise.all([
    supabase.from("services").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("company_id", current.company.id).neq("status", "canceled"),
    getCurrentProfile(),
    // null pra quem não é owner/admin (RLS) — o Dashboard só usa isso pro
    // alerta de "assinatura vencendo", que nesse caso simplesmente não
    // aparece (mesma regra de visibilidade que já existia em "Meu plano").
    getCurrentSubscription(),
  ]);

  const setup: SetupProgress = {
    perfilCompleto: !!current.company.logo_url,
    horarioConfigurado: !!current.company.business_hours,
    servicoCadastrado: (servicesCount ?? 0) > 0,
    profissionalCadastrado: (professionalsCount ?? 0) > 0,
    primeiroCliente: (clientsCount ?? 0) > 0,
    primeiroAtendimento: (appointmentsCount ?? 0) > 0,
    companySlug: current.company.slug,
  };

  return (
    <>
      <WelcomeToast />
      <DashboardView
        companyId={current.company.id}
        fullName={profile?.full_name ?? null}
        setup={setup}
        subscription={subscription ? { status: subscription.status, trial_ends_at: subscription.trial_ends_at, current_period_end: subscription.current_period_end } : null}
      />
    </>
  );
}
