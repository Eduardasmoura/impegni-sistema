import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Versão vigente do Contrato de Prestação de Serviços / Termos de Uso —
 * único lugar que precisa mudar quando o texto em `/contrato` for revisado
 * de forma que exija um novo aceite. Trocar aqui não apaga o histórico de
 * quem já aceitou a versão anterior (`terms_acceptances` guarda 1 linha
 * por versão, nunca sobrescreve).
 */
export const CURRENT_TERMS_VERSION = "1.0";

/**
 * Registra o aceite do contrato — chamado no mesmo instante em que
 * `stagePendingOnboarding` é chamado (logo após o `signUp`, ainda sem
 * sessão), pelo mesmo motivo: é a hora real em que a pessoa marcou a
 * caixa e clicou em "Criar minha conta", não quando ela confirma o
 * e-mail (que pode ser minutos ou dias depois, em outro aparelho).
 */
export async function stageTermsAcceptance(supabase: SupabaseClient<Database>, email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("stage_terms_acceptance", {
    p_email: email,
    p_document_type: "terms_of_service",
    p_document_version: CURRENT_TERMS_VERSION,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });
  return { error };
}
