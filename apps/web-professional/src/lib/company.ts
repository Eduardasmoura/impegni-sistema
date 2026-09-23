import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { extractSubdomain, ROOT_DOMAIN } from "@/lib/subdomain";
import type { Tables } from "@/lib/supabase/database.types";

export type CurrentCompany = {
  company: Tables<"companies">;
  roleEmpresa: string;
};

/**
 * A empresa (tenant) do profissional logado, junto com seu papel nela.
 *
 * Duas formas de resolver, nesta ordem:
 *
 * 1. **Por subdomínio** (`{slug}.app.impegni.com.br`, ex.:
 *    `studio-bella.app.impegni.com.br`) — a empresa vem do hostname, não
 *    de "qual empresa esse usuário tem". Uma única consulta (join) já
 *    resolve "existe uma empresa com esse slug da qual este usuário é
 *    membro ativo" — se o slug não existir OU o usuário não pertencer a
 *    essa empresa específica, a consulta simplesmente não retorna linha
 *    nenhuma e a função devolve `null`, sem distinguir os dois casos (não
 *    dá pra usar isso pra descobrir se um slug existe). Nunca cai no
 *    fallback abaixo nesse caso, porque isso mostraria a empresa errada (a
 *    "própria" do usuário) em vez de bloquear o acesso à empresa pedida na
 *    URL — a URL sozinha nunca é suficiente, quem decide é sempre esta
 *    checagem em `company_members`.
 *
 * 2. **Sem subdomínio** (domínio "nu" — `app.impegni.com.br` direto, ou
 *    `localhost` em dev sem slug) — comportamento de sempre: primeira
 *    empresa ativa do usuário. Cobre login, cadastro e onboarding, que
 *    acontecem antes de existir (ou de a pessoa saber) um slug pra ir. Um
 *    usuário pode pertencer a mais de uma empresa no schema, mas o app
 *    profissional trabalha com a primeira encontrada nesse caso — um
 *    seletor de empresa fica para quando o multi-empresa por usuário virar
 *    um caso real fora do acesso direto por subdomínio.
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

  const host = (await headers()).get("host") || "";
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  if (subdomain) {
    // Auditoria ETAPA 2: active=true explícito aqui, mesmo que a RLS já
    // esconda a linha de um membro desativado sozinha (is_company_member já
    // exige active=true) — deixa a intenção clara no código em vez de
    // depender só do efeito colateral da RLS. `companies!inner` (em vez de
    // `companies`) é o que faz o filtro por slug realmente excluir a linha
    // inteira quando não bate, não só esvaziar o objeto aninhado.
    const { data: membership } = await supabase
      .from("company_members")
      .select("role_empresa, companies!inner(*)")
      .eq("user_id", user.id)
      .eq("active", true)
      .eq("companies.slug", subdomain)
      .maybeSingle();
    if (!membership || !membership.companies) return null;

    return { company: membership.companies as Tables<"companies">, roleEmpresa: membership.role_empresa };
  }

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
