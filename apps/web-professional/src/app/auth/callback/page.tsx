"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Destino único de todos os links de e-mail do Supabase Auth. Trata os três
// formatos que chegam aqui:
//
// 1. Fragmento `#access_token=...&type=...` (fluxo implícito) — convite de
//    dono criado pelo Super Admin (`type=invite`), "Acessar como empresa"
//    (`magiclink`) e redefinição disparada pelo Super Admin (`recovery`).
//    O client de `@supabase/ssr` é PKCE e não processa esse fragmento
//    sozinho, então a sessão é criada manualmente com `setSession`.
// 2. Querystring `?code=...` (PKCE) — confirmação de cadastro. O client do
//    browser troca o código sozinho ao iniciar; se o link for aberto em
//    outro aparelho (sem o code_verifier), a troca falha, mas o e-mail já
//    foi confirmado pelo Supabase — basta a pessoa entrar com a senha.
// 3. Erro (`#error_code=otp_expired` etc.) — link expirado ou já usado.
//
// Convite e redefinição seguem para /definir-senha (quem foi convidado
// ainda não tem senha); o resto vai pro painel, que manda pro onboarding
// quem ainda não tem empresa — e o onboarding cria a empresa a partir do
// rascunho guardado no cadastro.
type Estado = { tipo: "carregando" } | { tipo: "confirmado" } | { tipo: "erro"; mensagem: string };

export default function AuthCallbackPage() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    let ativo = true;
    const supabase = createClient();

    async function processar() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
      const param = (k: string) => hash.get(k) ?? url.searchParams.get(k);

      const errorCode = param("error_code") || param("error");
      if (errorCode) {
        console.error("[auth/callback]", errorCode, param("error_description"));
        if (ativo)
          setEstado({
            tipo: "erro",
            mensagem:
              errorCode === "otp_expired"
                ? "Este link expirou ou já foi usado. Entre com seu e-mail e senha, ou peça um novo link."
                : "Não foi possível confirmar o acesso por este link.",
          });
        return;
      }

      const tipoLink = param("type");
      const precisaDefinirSenha = tipoLink === "invite" || tipoLink === "recovery";
      const destino = precisaDefinirSenha ? `/definir-senha${tipoLink === "invite" ? "?convite=1" : ""}` : "/dashboard";

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          console.error("[auth/callback] setSession", error.message);
          if (ativo) setEstado({ tipo: "erro", mensagem: "Não foi possível confirmar o acesso por este link." });
          return;
        }
        // Navegação "dura": o próximo request ao servidor já leva o cookie
        // de sessão recém-gravado (o layout autenticado é Server Component).
        window.location.replace(destino);
        return;
      }

      if (url.searchParams.get("code")) {
        // getSession() aguarda a troca automática do código pelo client.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.replace(destino);
          return;
        }
        // Aberto em outro aparelho: o Supabase já confirmou o e-mail.
        if (ativo) setEstado({ tipo: "confirmado" });
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        window.location.replace(destino);
        return;
      }
      if (ativo) setEstado({ tipo: "erro", mensagem: "Não foi possível confirmar o acesso por este link." });
    }

    processar();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {estado.tipo === "carregando" && (
          <>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Entrando...</p>
          </>
        )}
        {estado.tipo === "confirmado" && (
          <>
            <MailCheck className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-medium mb-1">E-mail confirmado!</p>
            <p className="text-sm text-muted-foreground mb-4">Entre com seu e-mail e senha para continuar a configuração da sua empresa.</p>
            <a href="/login" className="text-sm font-medium text-primary hover:underline">
              Ir para o login
            </a>
          </>
        )}
        {estado.tipo === "erro" && (
          <>
            <TriangleAlert className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">{estado.mensagem}</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <a href="/login" className="font-medium text-primary hover:underline">
                Ir para o login
              </a>
              <a href="/forgot-password" className="text-muted-foreground hover:text-foreground">
                Esqueci minha senha
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
