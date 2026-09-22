import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { PagamentosView } from "./pagamentos-view";

export default async function PagamentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // RLS (`subscription_payments_select_managers_or_admin`, migration 043)
  // já garante que só owner/admin desta empresa (ou super admin) leem estas
  // linhas — outra empresa nunca aparece aqui, mesmo que o filtro abaixo
  // fosse removido por engano.
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("company_id", current.company.id)
    .order("created_at", { ascending: false });

  return <PagamentosView payments={payments ?? []} isManager={current.roleEmpresa === "owner" || current.roleEmpresa === "admin"} />;
}
