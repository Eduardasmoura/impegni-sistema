import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // robots.txt (rota de metadata do Next.js, criada na preparação de
  // produção) precisa ficar de fora do gate de auth — sem isso, buscá-la
  // sem sessão redirecionava pro /login em vez de servir o arquivo.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
