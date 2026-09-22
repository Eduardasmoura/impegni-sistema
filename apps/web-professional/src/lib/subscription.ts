import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import type { Tables } from "@/lib/supabase/database.types";

export type CurrentSubscription = Tables<"subscriptions"> & { plans: Tables<"plans"> | null };

/**
 * A assinatura mais recente da empresa atual, já com o plano embutido.
 * RLS (`subscriptions_select_managers_or_admin`) só libera leitura pra
 * owner/admin (`is_company_manager`) — outros papéis (profissional,
 * recepcionista) recebem `null` aqui sem erro, o que o menu de perfil usa
 * pra decidir se mostra "Meu plano"/"Pagamentos". Mesmo padrão `cache()`
 * por request de `getCurrentCompany()`/`getCurrentProfile()`.
 */
export const getCurrentSubscription = cache(async (): Promise<CurrentSubscription | null> => {
  const current = await getCurrentCompany();
  if (!current) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("company_id", current.company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as CurrentSubscription | null) ?? null;
});
