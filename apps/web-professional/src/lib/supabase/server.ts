import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieDomain } from "@/lib/subdomain";
import type { Database } from "./database.types";

// Usado em Server Components, Server Actions e Route Handlers. Lê/escreve o
// cookie de sessão via next/headers — nunca usa a service_role.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // domain: cobre todos os subdomínios de empresa — ver cookieDomain().
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component (sem permissão de escrita); o
            // middleware já cuida de renovar a sessão nesse caso.
          }
        },
      },
    }
  );
}
