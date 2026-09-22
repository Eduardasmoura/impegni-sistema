"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, CalendarCheck, User as UserIcon, LogOut, Heart, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Menu "Minha conta" no canto superior direito — reúne Meus agendamentos,
 * Perfil e Sair num só lugar, em vez de vários links soltos no header.
 */
export function AccountMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const nome = (user.user_metadata?.full_name as string | undefined) || user.email || "Minha conta";

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <UserIcon className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="hidden sm:inline max-w-[10rem] truncate">{nome}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card shadow-lg py-1 z-50"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium truncate">{nome}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Link
            href="/meus-agendamentos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            role="menuitem"
          >
            <CalendarCheck className="w-4 h-4" /> Meus agendamentos
          </Link>
          <Link
            href="/anamnese"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            role="menuitem"
          >
            <ClipboardList className="w-4 h-4" /> Ficha de anamnese
          </Link>
          <Link
            href="/favoritos"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            role="menuitem"
          >
            <Heart className="w-4 h-4" /> Favoritos
          </Link>
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            role="menuitem"
          >
            <UserIcon className="w-4 h-4" /> Perfil
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted text-left"
            role="menuitem"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
