import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { extractSubdomain } from "@/lib/subdomain";

// Rotas que exigem login; todo o resto (landing pública da empresa, catálogo
// de serviços, telas de auth) é acessível sem sessão — bem diferente do app
// profissional, aqui a navegação é majoritariamente pública.
const PROTECTED_PATHS = ["/meus-agendamentos", "/perfil"];

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3001";

// Auditoria ETAPA 1: sem essa variável configurada em produção, TODA
// página pública de agendamento ({empresa}.{domínio}) cai silenciosamente
// na home da plataforma em vez da página da empresa — sem erro, sem
// crash, só mostra a coisa errada. Isso troca "silencioso" por "visível
// nos logs do primeiro request", pra pegar esse esquecimento no primeiro
// smoke-test em produção, não meses depois com um cliente reclamando que
// o link dele não funciona. Roda uma vez por cold start do servidor
// (middleware é carregado uma vez, não a cada request).
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
  console.error(
    "[web-client] NEXT_PUBLIC_ROOT_DOMAIN não configurado em produção — todas as páginas públicas de agendamento (ex.: empresa.seudominio.com) vão cair na home da plataforma em vez da página da empresa. Configure essa variável de ambiente no provedor de hospedagem."
  );
}

// Em `kellyrein.inova.app`, reescreve internamente pra `/kellyrein` (home) ou
// `/kellyrein/agendar` — as mesmas rotas dinâmicas que já atendem o acesso
// por path (`inova.app/kellyrein`), sem duplicar nenhuma página. Qualquer
// outro caminho (/login, /perfil, /meus-agendamentos...) passa direto, são
// as mesmas telas pra cliente de qualquer empresa.
function resolveTenantRewrite(request: NextRequest): URL | null {
  const host = request.headers.get("host") || "";
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);
  if (!subdomain) return null;

  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}`;
    return url;
  }
  if (pathname === "/agendar") {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}/agendar`;
    return url;
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  const tenantRewriteUrl = resolveTenantRewrite(request);

  let supabaseResponse = tenantRewriteUrl
    ? NextResponse.rewrite(tenantRewriteUrl, { request })
    : NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = tenantRewriteUrl
            ? NextResponse.rewrite(tenantRewriteUrl, { request })
            : NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("returnTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
