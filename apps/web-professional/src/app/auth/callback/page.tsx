"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Callback do fluxo de magic link — usado hoje só pelo "Acessar como
// empresa" do Super Admin (admin-impersonate gera o link com
// redirectTo=/auth/callback). O magic link do Supabase entrega a sessão
// como fragmento da URL (#access_token=...&refresh_token=...), não como
// querystring — e o client de `@supabase/ssr` (ao contrário do
// supabase-js "puro") NÃO processa esse fragmento sozinho, porque foi
// desenhado em torno do fluxo PKCE (?code=) via cookie; aqui o fragmento
// tem que ser lido e trocado por sessão manualmente com `setSession`.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let ativo = true;

    async function processarFragmento() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        if (ativo) setErro(true);
        return;
      }

      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) {
        if (ativo) setErro(true);
        return;
      }

      // Navegação "dura" (não router.replace) de propósito: força um
      // request novo de verdade, garantindo que o cookie de sessão já
      // gravado pelo supabase-js vai junto no próximo carregamento do
      // servidor (o layout autenticado roda como Server Component).
      if (ativo) window.location.replace("/dashboard");
    }

    processarFragmento();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {erro ? (
          <>
            <p className="text-sm text-muted-foreground mb-3">Não foi possível confirmar o acesso.</p>
            <button onClick={() => router.replace("/login")} className="text-sm text-primary hover:underline">
              Voltar para o login
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Entrando...</p>
          </>
        )}
      </div>
    </div>
  );
}
