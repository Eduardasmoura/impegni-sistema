import { ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function SemAcessoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="font-heading text-xl font-semibold mb-2">Sem acesso</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {user?.email} está logado, mas essa conta não tem permissão de Super Admin na plataforma.
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
