"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "@/components/layout/logo";
import { LOGIN_URL, REGISTER_URL } from "@/lib/format";
import { cn } from "@/lib/utils";

// Âncoras com "/" na frente pra funcionarem também a partir de /termos-de-uso,
// /privacidade e da 404 (voltam pra home já na seção certa).
const NAV_LINKS = [
  { label: "Produto", href: "/#produto" },
  { label: "Funcionalidades", href: "/#funcionalidades" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Planos", href: "/#planos" },
  { label: "FAQ", href: "/#faq" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200 border-b",
        scrolled || mobileOpen
          ? "bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-foreground/[0.08]"
          : "bg-background border-transparent"
      )}
    >
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-float">
        Pular para o conteúdo
      </a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-0.5 text-[14.5px] text-foreground/70">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} className="px-3.5 py-2 rounded-md hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href={LOGIN_URL} className="px-3.5 py-2 text-[14.5px] font-medium text-foreground/75 hover:text-foreground transition-colors">
            Entrar
          </Link>
          <ButtonLink href={REGISTER_URL} size="sm" className="h-10 px-5">
            Começar grátis
          </ButtonLink>
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <ButtonLink href={REGISTER_URL} size="sm">
            Começar grátis
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            className="w-10 h-10 flex items-center justify-center rounded-md text-foreground/80 hover:bg-muted transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="menu-mobile" className="lg:hidden border-t border-foreground/[0.08] bg-background animate-fade-in">
          <nav aria-label="Navegação principal (celular)" className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col text-[16px]">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="py-3 border-b border-foreground/[0.06] text-foreground/85">
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
