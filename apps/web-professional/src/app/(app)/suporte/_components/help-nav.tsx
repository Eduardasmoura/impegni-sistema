"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessageSquarePlus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const ITENS = [
  { href: "/suporte", label: "Central de Ajuda", curto: "Ajuda", icon: BookOpen, ativo: (p: string) => p === "/suporte" || p.startsWith("/suporte/categoria") || p.startsWith("/suporte/artigo") },
  { href: "/suporte/solicitar", label: "Falar com o suporte", curto: "Suporte", icon: MessageSquarePlus, ativo: (p: string) => p.startsWith("/suporte/solicitar") },
  { href: "/suporte/solicitacoes", label: "Minhas solicitações", curto: "Solicitações", icon: Inbox, ativo: (p: string) => p.startsWith("/suporte/solicitacoes") },
];

export function HelpNav() {
  const pathname = usePathname() || "";
  return (
    <nav aria-label="Ajuda e suporte" className="mb-6">
      <div className="grid grid-cols-3 sm:inline-flex gap-1 rounded-xl bg-muted p-1 w-full sm:w-auto">
        {ITENS.map((i) => {
          const ativo = i.ativo(pathname);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                ativo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i.icon className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{i.curto}</span>
              <span className="hidden sm:inline">{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
