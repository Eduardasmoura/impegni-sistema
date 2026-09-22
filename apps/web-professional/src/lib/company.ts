import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type CurrentCompany = {
  company: Tables<"companies">;
  roleEmpresa: string;
};

/**
 * A empresa (tenant) do profissional logado, junto com seu papel nela.
 * Um usuário pode pertencer a mais de uma empresa no schema, mas o app
 * profissional trabalha com a primeira encontrada nesta primeira versão —
 * um seletor de empresa fica para quando o multi-empresa por usuário virar
 * um caso real.
 *
 * `cache()` (memoização por request do React) faz `layout.tsx` e o
 * `page.tsx` de cada rota chamarem esta função sem duplicar a consulta —
 * antes disso, toda navegação fazia a mesma busca de `company_members`
 * duas vezes (uma no layout, outra na página).
 */
export const getCurrentCompany = cache(async (): Promise<CurrentCompany | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Auditoria ETAPA 2: active=true explícito aqui, mesmo que a RLS já
  // esconda a linha de um membro desativado sozinha (is_company_member já
  // exige active=true) — deixa a intenção clara no código em vez de
  // depender só do efeito colateral da RLS.
  const { data: membership } = await supabase
    .from("company_members")
    .select("role_empresa, companies(*)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.companies) return null;

  return { company: membership.companies as Tables<"companies">, roleEmpresa: membership.role_empresa };
});
