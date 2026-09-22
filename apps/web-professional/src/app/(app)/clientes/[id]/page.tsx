import { notFound, redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { ClienteFichaView } from "./cliente-ficha-view";

export default async function ClienteFichaPage({ params }: { params: { id: string } }) {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();

  // Filtro explícito por company_id além do que a RLS já garante — mesmo
  // padrão defensivo usado em outras telas do app (não depender só da
  // policy pra isolar tenant).
  const { data: cliente } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", current.company.id)
    .maybeSingle();
  if (!cliente) notFound();

  const { data: anamnesisEnabled } = await supabase.rpc("company_has_feature", {
    p_company_id: current.company.id,
    p_feature_key: "anamnesis",
  });

  return <ClienteFichaView companyId={current.company.id} cliente={cliente} anamnesisEnabled={!!anamnesisEnabled} />;
}
