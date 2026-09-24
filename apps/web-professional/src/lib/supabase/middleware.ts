import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomain } from "@/lib/subdomain";
import type { Database } from "./database.types";

// /auth/callback fica público porque, no primeiro request, a sessão do
// magic link ainda não existe em cookie nenhum — ela chega no fragmento da
// URL (#access_token=...), que só o supabase-js rodando no navegador
// consegue ler; o middleware bloquear essa rota pra quem "ainda não está
// logado" impediria exatamente o login acontecer.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth/callback"];

// /contrato é público mas, diferente das rotas acima, faz sentido ler
// estando logado também (não é uma rota "só pra quem não tem conta") — por
// isso fica fora de PUBLIC_PATHS (que redireciona pro dashboard quem já
// está logado) e entra só na checagem de "não exige login". O link "Ler
// contrato completo" da Etapa 5 do cadastro abre em nova aba sem sessão
// nenhuma (signUp exige confirmação de e-mail antes de logar).
//
// /auth/confirm e /reset-password (recuperação de senha, fluxo token_hash)
// também: /auth/confirm cria a sessão de recuperação e manda pra
// /reset-password, que precisa abrir justamente COM a pessoa logada — se
// ficasse em PUBLIC_PATHS, ela seria jogada pro dashboard sem trocar a senha.
const ALWAYS_PUBLIC_PATHS = ["/contrato", "/auth/confirm", "/reset-password"];

// Renova o cookie de sessão em toda request e redireciona quem não está
// logado para /login (rotas públicas de auth ficam de fora dessa guarda).
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { domain: cookieDomain() },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const isAlwaysPublicPath = ALWAYS_PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath && !isAlwaysPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
