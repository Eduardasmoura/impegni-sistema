import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Destino do link do e-mail "Reset Password" (template do Supabase:
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery).
// Fluxo token_hash: o token é validado aqui no servidor com verifyOtp, sem
// depender do cookie "code verifier" do PKCE — por isso funciona mesmo quando
// o e-mail é aberto em outro navegador/dispositivo. A sessão fica nos cookies
// (via @supabase/ssr) e a pessoa segue para /reset-password.
// O token nunca é logado nem guardado; em caso de erro, só o código do erro.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL("/reset-password", request.url));
    }
    console.error("[auth/confirm] verifyOtp falhou:", error.code ?? error.status ?? "sem código");
  }

  const url = new URL("/reset-password", request.url);
  url.searchParams.set("erro", "link");
  return NextResponse.redirect(url);
}
