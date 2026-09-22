"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Sair — mesma lógica de `sidebar-nav.tsx`, extraída porque a tela de acesso
 * bloqueado (`access-blocked-screen.tsx`) precisa do botão sem o resto do
 * menu de perfil em volta. */
export function SignOutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} className="gap-2">
      <LogOut className="w-4 h-4" /> Sair
    </Button>
  );
}
