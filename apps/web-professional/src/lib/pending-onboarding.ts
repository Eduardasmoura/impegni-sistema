import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Dados de negócio/segmento/objetivos/endereço coletados no wizard (Etapas
 * 2-4) — tudo que ainda não tem onde morar antes de a empresa existir.
 * Nunca inclui senha (bloqueado também no banco, em `stage_pending_onboarding`).
 */
export type PendingOnboardingPayload = {
  phone: string;
  businessName: string;
  document: string;
  businessSize: string;
  staffSizeRange: string;
  segmentId: string;
  otherSegment: string | null;
  goals: string[];
  zipCode: string;
  street: string;
  neighborhood: string;
  addressNumber: string;
  complement: string;
  city: string;
  state: string;
};

/**
 * Guarda o rascunho no banco (função `stage_pending_onboarding`), chaveado
 * pelo e-mail — chamada logo após o `signUp`, quando ainda não existe
 * sessão (por isso não dá pra gravar direto em `companies`/`company_goals`,
 * que exigem `auth.uid()`). Sobrevive à confirmação de e-mail em qualquer
 * aparelho, ao contrário de um rascunho em localStorage/sessionStorage.
 */
export async function stagePendingOnboarding(
  supabase: SupabaseClient<Database>,
  email: string,
  payload: PendingOnboardingPayload,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("stage_pending_onboarding", {
    p_email: email,
    p_payload: payload as unknown as Database["public"]["Functions"]["stage_pending_onboarding"]["Args"]["p_payload"],
  });
  return { error };
}

/**
 * Recupera o rascunho do usuário já logado (`get_pending_onboarding`
 * resolve o e-mail pelo próprio `auth.uid()`, nunca aceita um e-mail
 * arbitrário) — funciona em qualquer aparelho, é o que fecha o buraco do
 * localStorage não atravessar dispositivos.
 */
export async function fetchPendingOnboarding(supabase: SupabaseClient<Database>): Promise<PendingOnboardingPayload | null> {
  const { data, error } = await supabase.rpc("get_pending_onboarding");
  if (error || !data) return null;
  return data as unknown as PendingOnboardingPayload;
}
