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
 */
export async function getCurrentCompany(): Promise<CurrentCompany | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("company_members")
    .select("role_empresa, companies(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.companies) return null;

  return { company: membership.companies as Tables<"companies">, roleEmpresa: membership.role_empresa };
}
