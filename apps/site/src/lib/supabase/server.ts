import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Site de vendas é 100% público e não-autenticado — não existe sessão de
// usuário nem cookie pra gerenciar aqui, então usa o client simples
// (`@supabase/supabase-js`) em vez do `@supabase/ssr` que o painel usa.
// Só a chave anon (pública por definição) — as tabelas lidas aqui
// (`plans`/`plan_features`) já têm RLS de leitura pública pra plano ativo,
// a mesma regra que o painel usa. Nunca chega perto de service_role.
export function createClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
