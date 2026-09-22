"use client";

import Link from "next/link";
import { Scissors, LogIn } from "lucide-react";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { AccountMenu } from "@/components/account-menu";

export function SiteHeader() {
  const { user } = useSupabaseUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scissors className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold hidden sm:inline">InovaFlow</span>
        </Link>

        {user ? (
          <AccountMenu user={user} />
        ) : (
          <Link href="/login" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <LogIn className="w-4 h-4" /> Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
