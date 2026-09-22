"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

/**
 * Formulário de troca de senha — mesma API (`supabase.auth.updateUser`) usada
 * pelo perfil do cliente, agora compartilhada entre `/perfil` e `/seguranca`
 * neste app (um único componente, pra não ter dois formulários fazendo a
 * mesma coisa em lugares diferentes).
 */
export function PasswordForm() {
  const { toast } = useToast();
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function trocarSenha() {
    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (senha !== confirmar) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro ao trocar senha", description: friendlyError(error, "trocar a senha"), variant: "destructive" });
      return;
    }
    setSenha("");
    setConfirmar("");
    toast({ title: "Senha alterada com sucesso!" });
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Trocar senha</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nova senha</Label><Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" /></div>
        <div><Label>Confirmar nova senha</Label><Input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" /></div>
        <Button onClick={trocarSenha} disabled={salvando || !senha || !confirmar} className="w-full gap-2">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} {salvando ? "Alterando..." : "Alterar senha"}
        </Button>
      </CardContent>
    </Card>
  );
}
