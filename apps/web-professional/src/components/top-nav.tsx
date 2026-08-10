"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarPlus, Users, Scissors, UserCog, Package, Wallet, Palette, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const ABAS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarPlus },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Scissors },
  { href: "/equipe", label: "Equipe", icon: UserCog },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/configuracao", label: "Identidade visual", icon: Palette },
];

export function TopNav({ companyName, userEmail }: { companyName: string; userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold hidden sm:inline">{companyName}</span>
        </Link>

        <nav className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {ABAS.map((aba) => {
            const active = pathname.startsWith(aba.href);
            return (
              <Link
                key={aba.href}
                href={aba.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <aba.icon className="w-4 h-4" />
                <span className="hidden md:inline">{aba.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted shrink-0"
          title={userEmail}
        >
          <span className="hidden sm:inline max-w-[8rem] truncate">{userEmail}</span>
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
