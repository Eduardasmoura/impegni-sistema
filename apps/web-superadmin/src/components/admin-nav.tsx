"use client";

// Casca de navegação do Super Admin — sidebar fixa/recolhível no desktop,
// drawer no mobile. Substitui a antiga barra horizontal (`AdminNav`), mas
// a autorização continua 100% no backend: isto aqui só decide o que
// aparece na tela, nunca o que o usuário pode fazer. Cada página server
// component continua chamando `requireSuperAdmin()` antes de renderizar
// qualquer coisa — a sidebar não participa disso.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck, LogOut, LayoutDashboard, Building2, Package, Users, CreditCard, Receipt,
  BarChart3, ScrollText, Settings, LifeBuoy, Megaphone, TrendingUp, HeartPulse,
  PanelLeftClose, PanelLeftOpen, Menu, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

// Mesmos hrefs de sempre (nenhum inventado) — só reorganizados em grupos.
const NAV_GROUPS: NavGroup[] = [
  { label: "Principal", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Gestão",
    items: [
      { href: "/empresas", label: "Empresas", icon: Building2 },
      { href: "/usuarios", label: "Usuários", icon: Users },
      { href: "/planos", label: "Planos", icon: Package },
      { href: "/assinaturas", label: "Assinaturas", icon: CreditCard },
      { href: "/pagamentos", label: "Pagamentos", icon: Receipt },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/suporte", label: "Suporte", icon: LifeBuoy },
      { href: "/comunicacao", label: "Comunicação", icon: Megaphone },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/saude", label: "Saúde do Sistema", icon: HeartPulse },
    ],
  },
  { label: "Segurança", items: [{ href: "/auditoria", label: "Auditoria", icon: ScrollText }] },
  // Grupo próprio (não misturado com "Segurança"/"Gestão") de propósito:
  // é aqui que a futura sub-navegação de Configurações (Geral / Segmentos /
  // Fichas de Anamnese / Papéis e permissões) vai crescer, sem precisar
  // reorganizar o resto da sidebar quando isso for construído.
  { label: "Configuração", items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }] },
];

const COLLAPSE_STORAGE_KEY = "impegni-admin-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AdminShell({ userEmail, children }: { userEmail?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Preferência do usuário (se já existir) vence; sem preferência salva,
  // tablet (768–1023px) começa recolhida e desktop começa expandida — só
  // decidido no client pra não divergir do HTML que o servidor mandou.
  useEffect(() => {
    const saved = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "true" || saved === "false") {
      setCollapsed(saved === "true");
      return;
    }
    setCollapsed(window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        {/* Topbar só no mobile — a sidebar de verdade vira um drawer aqui */}
        <header className="md:hidden sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur flex items-center gap-3 px-4">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <button aria-label="Abrir menu" className="p-2 -ml-2 rounded-lg hover:bg-muted text-foreground">
                <Menu className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent
              className="left-0 top-0 h-full max-h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r border-border border-y-0 border-l-0 p-0 gap-0 flex flex-col data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
              aria-describedby={undefined}
            >
              <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
              <SidebarContent
                pathname={pathname}
                collapsed={false}
                userEmail={userEmail}
                onNavigate={() => setMobileOpen(false)}
                onLogout={handleLogout}
              />
            </DialogContent>
          </Dialog>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-semibold text-sm">Impegni Admin</span>
          </Link>
        </header>

        {/* Sidebar fixa — md+ */}
        <aside
          className={cn(
            "hidden md:flex md:flex-col fixed inset-y-0 left-0 z-30 border-r border-border bg-card transition-[width] duration-200",
            collapsed ? "md:w-[72px]" : "md:w-64"
          )}
        >
          <SidebarContent
            pathname={pathname}
            collapsed={collapsed}
            userEmail={userEmail}
            onLogout={handleLogout}
            toggle={<CollapseToggle collapsed={collapsed} onClick={toggleCollapsed} />}
          />
        </aside>

        <div className={cn("transition-[padding-left] duration-200", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}

function CollapseToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{collapsed ? "Expandir menu" : "Recolher menu"}</TooltipContent>
    </Tooltip>
  );
}

// Conteúdo compartilhado entre a sidebar fixa (desktop) e o drawer
// (mobile) — mesma estrutura, só muda quem a envolve por fora.
function SidebarContent({
  pathname,
  collapsed,
  userEmail,
  onNavigate,
  onLogout,
  toggle,
}: {
  pathname: string;
  collapsed: boolean;
  userEmail?: string;
  onNavigate?: () => void;
  onLogout: () => void;
  toggle?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={cn("h-16 shrink-0 flex items-center border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link href="/" onClick={onNavigate} className={cn("flex items-center gap-2 min-w-0", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading font-semibold text-sm leading-tight truncate">Impegni</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Super Admin</p>
            </div>
          )}
        </Link>
        {!collapsed && toggle}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mx-3 my-2 border-t border-border" />}
            <ul className={cn("space-y-0.5", collapsed ? "px-2" : "px-2")}>
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center h-10 w-10 mx-auto" : "px-2.5 py-2",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 border-t border-border", collapsed ? "p-2" : "p-3")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 cursor-default">
                  {(userEmail ?? "SA").slice(0, 2).toUpperCase()}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{userEmail ?? "Super Admin"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onLogout} aria-label="Sair" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
              {(userEmail ?? "SA").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={userEmail}>{userEmail ?? "Super Admin"}</p>
              <p className="text-[11px] text-muted-foreground">Super Admin</p>
            </div>
            <button onClick={onLogout} aria-label="Sair" title="Sair" className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
