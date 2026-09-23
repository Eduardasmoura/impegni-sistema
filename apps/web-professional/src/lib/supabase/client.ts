import { createBrowserClient } from "@supabase/ssr";
import { cookieDomain } from "@/lib/subdomain";
import type { Database } from "./database.types";

// Usado em Client Components. Chave pública (anon) — RLS decide o que cada
// usuário pode ver/alterar, nunca a service_role neste app.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // domain igual ao do server (lib/supabase/server.ts) — se um lado grava
    // o cookie de um jeito e o outro lê esperando outro escopo, a sessão
    // fica inconsistente entre subdomínios de empresa.
    { cookieOptions: { domain: cookieDomain() } }
  );
}
