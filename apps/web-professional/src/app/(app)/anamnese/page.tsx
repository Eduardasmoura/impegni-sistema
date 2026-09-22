import { getCurrentCompany } from "@/lib/company";
import { getCurrentSubscription } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnamneseView } from "./anamnese-view";

export default async function AnamnesePage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  // Plano Basic (migration 093) tem anamnese, mas travada num template
  // padrão — só quem tem `anamnesis_customizable` pode criar/editar/
  // reordenar/excluir pergunta (aplicado de verdade por trigger no banco,
  // `enforce_anamnesis_customization`; isto aqui só decide o que a UI
  // mostra). Fail-open (mesmo critério de `plan-limits.ts`) quando a
  // assinatura não é legível pro papel atual ou a feature não está
  // cadastrada — quem decide de verdade é sempre o banco.
  const subscription = await getCurrentSubscription();
  let canCustomize = true;
  if (subscription?.plan_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("plan_features")
      .select("enabled")
      .eq("plan_id", subscription.plan_id)
      .eq("feature_key", "anamnesis_customizable")
      .maybeSingle();
    if (data) canCustomize = data.enabled;
  }

  return <AnamneseView companyId={current.company.id} canCustomize={canCustomize} />;
}
