import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guarda de acesso das páginas autenticadas: precisa estar logado E ter
 * `profiles.role_platform = 'super_admin'`. A policy `profiles_select_own_or_super_admin`
 * já deixa qualquer usuário ler o próprio profile, então essa checagem
 * funciona com a sessão normal (sem precisar de service_role).
 */
export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role_platform").eq("id", user.id).single();
  if (profile?.role_platform !== "super_admin") redirect("/sem-acesso");

  return { user, supabase };
}
