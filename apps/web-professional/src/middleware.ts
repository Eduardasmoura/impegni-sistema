import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // robots.txt/sitemap.xml (rotas de metadata do Next.js, criadas na
  // preparação de produção) precisam ficar de fora do gate de auth — sem
  // isso, um visitante sem sessão era redirecionado pro /login ao tentar
  // buscá-las, e um crawler nunca via a regra de disallow de verdade.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
