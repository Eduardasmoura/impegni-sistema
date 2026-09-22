"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordForm } from "@/components/password-form";
import { createClient } from "@/lib/supabase/client";

export function SegurancaView({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <h1 className="font-heading text-3xl font-semibold mb-1">Segurança</h1>
      <p className="text-sm text-muted-foreground mb-6">Conta conectada como <span className="font-medium text-foreground">{userEmail}</span>.</p>

      <div className="space-y-4">
        <PasswordForm />

        <Card>
          <CardHeader><CardTitle className="text-base">Sessão</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={sair} className="w-full gap-2">
              <LogOut className="w-4 h-4" /> Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
