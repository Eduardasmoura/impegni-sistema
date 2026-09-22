"use client";

import { useState } from "react";
import Link from "next/link";
import { Scissors, Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { LOGIN_URL, REGISTER_URL } from "@/lib/format";

const NAV_LINKS = [
  { label: "Funcionalidades", href: "#solucao" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Para profissionais", href: "#link-agendamento" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <Scissors className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
      </div>
      <span className="font-heading text-[17px] font-semibold tracking-tight">Impegni</span>
    </Link>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-1 text-sm font-medium text-foreground/80">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="px-3.5 py-2 rounded-lg hover:text-foreground hover:bg-muted transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <Link href={LOGIN_URL} className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Entrar
          </Link>
          <ButtonLink href={REGISTER_URL} size="md">
            Começar teste grátis
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink href={REGISTER_URL} size="md" className="h-9 px-4">
            Começar teste grátis
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/80 hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border/70 bg-background">
          <nav aria-label="Navegação principal" className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex flex-col gap-0.5 text-[15px] font-medium">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-3 border-b border-border/60 text-foreground/85"
              >
                {link.label}
              </a>
            ))}
            <Link href={LOGIN_URL} onClick={() => setMobileOpen(false)} className="py-3 text-foreground/85">
              Entrar
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
