import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";

export type PlanLimits = {
  maxUsers: number | null;
  maxProfessionals: number | null;
  maxClients: number | null;
  maxAppointments: number | null;
};

/**
 * Só os limites numéricos do plano da empresa atual (via RPC
 * `get_company_plan_limits`, migration 044) — diferente de
 * `getCurrentSubscription()` (`lib/subscription.ts`), que só managers
 * conseguem ler (RLS de `subscriptions`). Isso aqui qualquer membro da
 * empresa lê, porque decide algo que precisa valer pra todos os papéis: se
 * o módulo "Equipe" aparece ou não (ver regra de negócio em `layout.tsx`).
 * `null` num limite = sem teto (ex.: plano Premium).
 */
export const getCompanyPlanLimits = cache(async (): Promise<PlanLimits | null> => {
  const current = await getCurrentCompany();
  if (!current) return null;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_company_plan_limits", { p_company_id: current.company.id }).maybeSingle();

  if (!data) return null;
  return {
    maxUsers: data.max_users,
    maxProfessionals: data.max_professionals,
    maxClients: data.max_clients,
    maxAppointments: data.max_appointments,
  };
});

/**
 * Regra de negócio: "Equipe" fica acessível sempre que a empresa ainda não
 * atingiu o teto de profissionais do plano — inclusive quando não tem
 * NENHUM ainda. Sem assinatura/plano encontrado (não deveria acontecer em
 * produção) cai no lado permissivo — mostra o módulo — pra não esconder uma
 * funcionalidade por causa de um dado ausente/inconsistente.
 *
 * FASE 6 (auditoria UX) — bug corrigido aqui: a versão anterior checava
 * `maxProfessionals >= 2`, ou seja, uma empresa no plano Basic
 * (max_professionals = 1) nunca via o módulo "Equipe" — nem pra cadastrar o
 * PRIMEIRO profissional, que é obrigatório pra receber agendamento. Isso
 * travava o onboarding de qualquer empresa nova no plano de entrada. A
 * checagem correta é contra a contagem atual: só esconde quando já está no
 * teto (adicionar um a mais já é bloqueado de verdade pelo trigger
 * `enforce_limit_professionals` no banco — isto aqui só evita esconder a
 * tela de quem ainda pode cadastrar).
 */
export function planAllowsTeam(limits: PlanLimits | null, currentProfessionalsCount = 0): boolean {
  if (!limits) return true;
  return limits.maxProfessionals === null || currentProfessionalsCount < limits.maxProfessionals;
}
