import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { getCurrentSubscription } from "@/lib/subscription";
import { MeuPlanoView } from "./meu-plano-view";

export default async function MeuPlanoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  const subscription = await getCurrentSubscription();

  // Mesmas 4 contagens de uso já usadas em
  // `apps/web-superadmin/.../empresa-detail-view.tsx`, agora do lado do
  // profissional — o dono da empresa vê exatamente o mesmo número que o
  // Super Admin vê pra ela.
  const [
    { count: memberCount },
    { count: professionalCount },
    { count: clientCount },
    { count: appointmentCount },
    { data: features },
    { data: plans, error: plansError },
    { data: allFeatures },
  ] = await Promise.all([
    supabase.from("company_members").select("*", { count: "exact", head: true }).eq("company_id", current.company.id).eq("active", true),
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("company_id", current.company.id)
      .neq("status", "canceled")
      .gte("scheduled_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    subscription ? supabase.from("plan_features").select("*").eq("plan_id", subscription.plan_id).order("feature_key") : Promise.resolve({ data: [] }),
    supabase.from("plans").select("*").eq("active", true).order("price_cents"),
    // Recursos de TODOS os planos (não só o atual) — necessário pra montar
    // a tabela comparativa do PlanPicker (mesma tabela `plan_features` que
    // "Recursos incluídos" já usa acima, só sem o filtro por plano).
    supabase.from("plan_features").select("*"),
  ]);

  return (
    <MeuPlanoView
      isManager={current.roleEmpresa === "owner" || current.roleEmpresa === "admin"}
      company={current.company}
      subscription={subscription}
      features={features ?? []}
      allFeatures={allFeatures ?? []}
      plans={plans ?? []}
      plansError={!!plansError}
      usage={{
        users: memberCount ?? 0,
        professionals: professionalCount ?? 0,
        clients: clientCount ?? 0,
        appointments: appointmentCount ?? 0,
      }}
    />
  );
}
