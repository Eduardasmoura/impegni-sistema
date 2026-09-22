import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // `company_has_feature` (não só `company.anamnesis_enabled`) — considera
  // também o plano contratado, não só o override manual do super_admin (ver
  // migration 20260914150000_client_directory_rpcs). Antes desta correção a
  // aba de Clientes só liberava Anamnese pra quem tinha o override manual,
  // ignorando quem já tem o recurso pelo próprio plano.
  const supabase = await createClient();
  const { data: anamnesisEnabled } = await supabase.rpc("company_has_feature", {
    p_company_id: current.company.id,
    p_feature_key: "anamnesis",
  });

  return <ClientesView companyId={current.company.id} anamnesisEnabled={!!anamnesisEnabled} />;
}
