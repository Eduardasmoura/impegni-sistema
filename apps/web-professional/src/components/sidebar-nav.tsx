"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarPlus, Users, Scissors, UserCog, Package, Wallet, Star, Tag, Store,
  Settings, User, LogOut, ChevronDown, CreditCard, Receipt, Bell, ShieldCheck, HelpCircle, Menu, X,
  UserSearch, ListOrdered, Megaphone, CalendarOff, ClipboardList, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsBell } from "@/components/notifications-bell";
import { GlobalSearch, GlobalSearchIconButton } from "@/components/global-search";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Mesmas rotas de sempre (nenhuma tela nova) — só reorganizadas em grupos.
// "Relatórios" agora é uma página própria (Central de Relatórios,
// /relatorios) — deixou de ser fictícia porque foi pedida e construída
// como tal; Dashboard e Financeiro continuam existindo do jeito que
// sempre existiram, a Central só organiza a análise num lugar só.
// "Meu estabelecimento"/"Identidade visual" do pedido eram a MESMA rota
// (/configuracao) com 2 rótulos diferentes em 2 lugares — unificado num
// item só, pra não duplicar.
const GRUPOS: { label: string; itens: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Principal",
    itens: [
      { href: "/dashboard", label: "Início", icon: LayoutDashboard },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/agenda", label: "Agenda", icon: CalendarPlus },
      { href: "/agenda/espera", label: "Lista de espera", icon: ListOrdered },
      { href: "/agenda/bloqueios", label: "Bloqueios, folgas e férias", icon: CalendarOff },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/clientes/segmentos", label: "Segmentação", icon: UserSearch },
      { href: "/servicos", label: "Serviços", icon: Scissors },
    ],
  },
  {
    label: "Operação",
    itens: [
      { href: "/estoque", label: "Estoque", icon: Package },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      // Já existia como página (Configurações > Anamnese lidava com o
      // formulário; esta é a tela de preenchimento/consulta por cliente) —
      // só não tinha item na sidebar ainda. Não é gated por plano aqui pelo
      // mesmo motivo que Estoque/Financeiro não são: hoje todo plano ativo
      // libera 'anamnesis' em plan_features (só 'anamnesis_customizable' —
      // personalizar as perguntas — é exclusivo Premium, isso continua
      // checado dentro da própria tela).
      { href: "/anamnese", label: "Anamnese", icon: ClipboardList },
    ],
  },
  {
    label: "Marketing",
    itens: [
      { href: "/avaliacoes", label: "Avaliações", icon: Star },
      { href: "/cupons", label: "Cupons", icon: Tag },
      { href: "/marketing", label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    label: "Negócio",
    itens: [
      { href: "/equipe", label: "Equipe", icon: UserCog },
      { href: "/configuracao", label: "Meu estabelecimento", icon: Store },
    ],
  },
  {
    label: "Conta",
    itens: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
      { href: "/perfil", label: "Minha conta", icon: User },
    ],
  },
];

const COLLAPSE_KEY = "sidebar:collapsed";

export function SidebarNav({
  companyName,
  userEmail,
  fullName,
  avatarUrl,
  planName,
  showEquipe = true,
  isManager = false,
}: {
  companyName: string;
  userEmail?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  planName?: string | null;
  // Mesma regra de sempre — calculada no layout, não uma preferência de UI.
  showEquipe?: boolean;
  /** owner/admin — mesmo critério das páginas (Campanhas, caução etc.). */
  isManager?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Preferência de "recolhida" só existe no desktop (>=lg) e sobrevive a
  // reload — no mobile a sidebar é um drawer que sempre começa fechado
  // (pedido explícito: "no mobile não é necessário persistir o estado").
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function alternarCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  }

  // Fecha o drawer mobile sempre que a rota muda (seleção de item = fecha).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const grupos = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => showEquipe || i.href !== "/equipe") }));

  // Rotas como /clientes/segmentos e /agenda/espera são "filhas" de
  // /clientes e /agenda (prefixo em comum) — startsWith puro marcaria os
  // 2 itens como ativos ao mesmo tempo. Em vez disso, entre todos os
  // itens cujo href bate com a rota atual, só o mais específico (o href
  // mais longo) fica ativo.
  const todosHrefs = grupos.flatMap((g) => g.itens.map((i) => i.href));
  const hrefAtivo = todosHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const primeiroNome = (fullName || userEmail || "Conta").trim().split(/\s+/)[0];
  const iniciais = (fullName || userEmail || "?").charAt(0).toUpperCase();
  // Mesma regra de sempre: RLS já restringe quem recebe planName != null
  // (owner/admin) — isto só evita levar profissional/recepcionista a uma
  // tela vazia, não é a segurança de verdade.
  const mostrarAssinatura = !!planName;

  const conteudoPerfil = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg text-sm hover:bg-muted transition-colors w-full",
            collapsed ? "justify-center p-2" : "pl-1.5 pr-2 py-1.5"
          )}
          title={userEmail}
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{iniciais}</span>
            )}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 flex flex-col items-start leading-tight min-w-0">
                {/* FASE 6 (auditoria UX) — `items-start` faz o filho de um
                    flex-col dimensionar pelo próprio conteúdo, não pela
                    largura do pai; sem `w-full` aqui, `truncate` não tinha
                    contra o que cortar e o nome/e-mail vazava pra fora da
                    sidebar (visível de verdade no drawer mobile, onde o
                    container fica fora da tela mas o texto "escapava"). */}
                <span className="truncate font-medium w-full">{primeiroNome}</span>
                {planName && <span className="text-[11px] text-muted-foreground truncate w-full">{planName}</span>}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil"><User className="w-4 h-4" /> Meu perfil</Link>
        </DropdownMenuItem>
        {mostrarAssinatura && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/meu-plano"><CreditCard className="w-4 h-4" /> Meu plano</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/pagamentos"><Receipt className="w-4 h-4" /> Pagamentos</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/avisos"><Bell className="w-4 h-4" /> Notificações</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notificacoes"><Bell className="w-4 h-4" /> Lembretes aos clientes</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/seguranca"><ShieldCheck className="w-4 h-4" /> Segurança</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/suporte"><HelpCircle className="w-4 h-4" /> Ajuda e suporte</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const sidebarInterna = (
    <>
      <div className={cn("h-16 flex items-center border-b border-border shrink-0", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold truncate min-w-0">{companyName}</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </Link>
        )}
        {/* Botão de recolher/expandir — só no desktop (o mobile fecha pelo X
            ou pelo backdrop). Um único elemento por estado: quando recolhida
            não cabe ao lado do logo, então vira uma linha própria logo
            abaixo (ver bloco seguinte) em vez de existir duas vezes no DOM. */}
        {!collapsed && (
          <div className="hidden lg:flex items-center gap-0.5 shrink-0">
            <GlobalSearchIconButton />
            <NotificationsBell />
            <button
              onClick={alternarCollapsed}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {collapsed && (
        <div className="hidden lg:flex flex-col items-center gap-1 py-2 border-b border-border">
          <button onClick={alternarCollapsed} aria-label="Expandir menu" title="Expandir menu" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <Menu className="w-4 h-4" />
          </button>
          <GlobalSearchIconButton />
          <NotificationsBell />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            {!collapsed && <p className="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{grupo.label}</p>}
            <div className="space-y-0.5">
              {grupo.itens.map((item) => {
                const active = item.href === hrefAtivo;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center p-2.5" : "px-2.5 py-2",
                      active ? "bg-primary/10 text-[hsl(var(--primary-emphasis))]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2 shrink-0">{conteudoPerfil}</div>
    </>
  );

  return (
    <>
      {/* Barra fina só no mobile — a sidebar de verdade fica oculta por
          padrão nesse breakpoint, então precisa de um jeito de abri-la. */}
      <header className="lg:hidden sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Expandir menu"
          title="Expandir menu"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-heading font-semibold truncate">{companyName}</span>
        <GlobalSearchIconButton className="ml-auto" />
        <NotificationsBell className="-mr-1.5" align="end" />
      </header>

      {/* Busca global (⌘K / Ctrl K) — uma instância para o painel todo. */}
      <GlobalSearch permissions={{ equipe: showEquipe, manager: isManager, assinatura: !!planName }} />

      {/* Backdrop do drawer mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar desktop (fixa, largura anima) */}
      <aside
        className={cn(
          "hidden lg:flex flex-col shrink-0 border-r border-border bg-card h-screen sticky top-0 transition-[width] duration-200 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {sidebarInterna}
      </aside>

      {/* Sidebar mobile (drawer sobreposto, sempre "expandida" — ícone-only
          não faz sentido num overlay que já esconde tudo por padrão). */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="font-heading font-semibold truncate">{companyName}</span>
          <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu" title="Fechar menu" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.label}>
              <p className="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{grupo.label}</p>
              <div className="space-y-0.5">
                {grupo.itens.map((item) => {
                  const active = item.href === hrefAtivo;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-primary/10 text-[hsl(var(--primary-emphasis))]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-2 shrink-0">{conteudoPerfil}</div>
      </aside>
    </>
  );
}
