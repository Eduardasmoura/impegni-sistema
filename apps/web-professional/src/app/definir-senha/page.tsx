"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

// Página autenticada (fora de PUBLIC_PATHS no middleware — quem chega aqui
// já tem sessão criada pelo /auth/callback). Usada por quem aceitou o
// convite de dono de empresa criada pelo Super Admin (ainda sem senha) e
// por quem recebeu a redefinição de senha disparada pelo Super Admin.
function DefinirSenhaForm() {
  const convite = useSearchParams().get("convite") === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(friendlyError(updateError, "salvar sua senha"));
      return;
    }
    window.location.replace("/dashboard");
  }

  return (
    <AuthLayout
      icon={ShieldCheck}
      title={convite ? "Crie sua senha" : "Nova senha"}
      subtitle={convite ? "Sua empresa já está pronta no Impegni. Crie uma senha para acessar." : "Escolha uma nova senha para sua conta"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" autoFocus minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirme a senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="confirm" type="password" minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : convite ? "Criar senha e entrar" : "Salvar nova senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function DefinirSenhaPage() {
  return (
    <Suspense>
      <DefinirSenhaForm />
    </Suspense>
  );
}
