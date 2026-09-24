"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Link inválido/expirado/já usado: /auth/confirm redireciona com ?erro=link.
  const [linkInvalido, setLinkInvalido] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("erro") === "link") setLinkInvalido(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      // Sem sessão de recuperação (link não aberto por aqui ou já expirado).
      if (/session missing|not authenticated/i.test(updateError.message)) {
        setLinkInvalido(true);
        return;
      }
      setError(friendlyError(updateError, "atualizar sua senha"));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <AuthLayout icon={ShieldCheck} title="Nova senha" subtitle="Escolha uma nova senha para sua conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        {linkInvalido && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Este link de recuperação é inválido, expirou ou já foi usado.{" "}
            <a href="/forgot-password" className="font-medium underline">
              Solicite um novo link
            </a>
            .
          </div>
        )}
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoFocus
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar nova senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
