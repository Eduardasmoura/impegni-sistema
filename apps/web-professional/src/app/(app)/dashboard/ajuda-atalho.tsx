import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";

// Atalho discreto para a Central de Ajuda existente (/suporte), logo abaixo
// do guia "Complete seu estabelecimento".
export function AjudaAtalho() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <LifeBuoy className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Precisa de ajuda?</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Encontre respostas rápidas, veja nossos tutoriais ou fale com nosso suporte.</p>
        </div>
      </div>
      <Link href="/suporte" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0 self-start sm:self-auto ml-12 sm:ml-0">
        Acessar Ajuda e Suporte <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
