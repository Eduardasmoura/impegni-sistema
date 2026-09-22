import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AccessStatus = {
  allowed: boolean;
  reason: string;
  companyStatus: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

/**
 * Fonte única de verdade sobre se a empresa atual pode usar o produto
 * agora — chama a RPC `get_company_access_status` (migration 046), a
 * MESMA que o mobile chama. Web e mobile nunca reimplementam a regra
 * (trial vencido / assinatura cancelada-suspensa / empresa suspensa) cada
 * um do seu jeito — só leem o resultado desta função.
 *
 * Verificado aqui em `(app)/layout.tsx` (um ponto só, cobre todas as
 * rotas autenticadas de uma vez) — deliberadamente não duplicado em
 * `middleware.ts`, que continua só checando autenticação. Motivo: o
 * middleware roda em Edge Runtime pra toda navegação (inclusive
 * prefetch/assets); repetir aqui a mesma consulta ao banco custaria uma
 * ida ao Postgres a mais por request sem ganhar nenhuma proteção — o
 * layout já é o único lugar por onde toda página autenticada passa.
 */
export const getCompanyAccessStatus = cache(async (companyId: string): Promise<AccessStatus | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_company_access_status", { p_company_id: companyId }).maybeSingle();
  if (error || !data) return null;
  return {
    allowed: data.allowed,
    reason: data.reason,
    companyStatus: data.company_status,
    subscriptionStatus: data.subscription_status,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
  };
});
