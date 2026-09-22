import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

/**
 * O `profiles` (nome, telefone, avatar) do usuário logado. Mesmo padrão de
 * `cache()` por request de `getCurrentCompany()` (ver `company.ts`) — o
 * `layout.tsx` e a página `/perfil` podem chamar isso sem duplicar a consulta.
 */
export const getCurrentProfile = cache(async (): Promise<Tables<"profiles"> | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return profile ?? null;
});
