"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(friendlyError(resetError, "enviar o link de redefinição"));
      return;
    }
    setSent(true);
  }

  return (
    <AuthLayout
      icon={KeyRound}
      title="Esqueceu a senha?"
      subtitle="Enviamos um link para redefinir sua senha"
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-center text-muted-foreground">
          Se existir uma conta com o email <strong>{email}</strong>, enviamos um link de redefinição.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
