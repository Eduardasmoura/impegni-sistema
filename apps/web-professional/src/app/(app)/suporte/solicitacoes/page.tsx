import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { SolicitacoesView } from "./solicitacoes-view";

export const metadata = { title: "Minhas solicitações — Impegni" };

export default async function MinhasSolicitacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <SolicitacoesView companyId={current.company.id} userId={user.id} />;
}
