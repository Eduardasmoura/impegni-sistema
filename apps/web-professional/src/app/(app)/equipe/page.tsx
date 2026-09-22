import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyPlanLimits, planAllowsTeam } from "@/lib/plan-limits";
import { EquipeView } from "./equipe-view";

export default async function EquipePage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // Mesma regra do menu (`sidebar-nav.tsx`) aplicada aqui também — bloqueia
  // quem tentar acessar "/equipe" direto pela URL já no teto de
  // profissionais do plano. A trava de dados de verdade (não deixar
  // inserir um profissional a mais) já existe há mais tempo no banco
  // (trigger `enforce_limit_professionals`, baseada em
  // `plans.max_professionals`) — isto aqui só evita que a pessoa chegue a
  // ver a tela achando que pode cadastrar mais um. FASE 6: a checagem
  // agora é contra a contagem atual (não contra "o plano permite 2+"), pra
  // não bloquear quem ainda não tem nenhum profissional cadastrado.
  const supabase = await createClient();
  const [planLimits, { count: professionalsCount }] = await Promise.all([
    getCompanyPlanLimits(),
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", current.company.id),
  ]);
  if (!planAllowsTeam(planLimits, professionalsCount ?? 0)) redirect("/dashboard");

  return <EquipeView companyId={current.company.id} />;
}
