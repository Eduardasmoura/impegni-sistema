import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { SuporteView } from "./suporte-view";

export const metadata = { title: "Ajuda e Suporte — Impegni" };

export default async function SuportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // company_id só indica QUAL das empresas do usuário está aberta; a Edge
  // Function confere o vínculo ativo antes de registrar o chamado.
  return <SuporteView companyId={current.company.id} userEmail={user.email ?? ""} />;
}
