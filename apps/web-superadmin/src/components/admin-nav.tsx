"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminNav({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/empresas" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold">Barber iNova Admin</span>
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted" title={userEmail}>
          <span className="hidden sm:inline max-w-[10rem] truncate">{userEmail}</span>
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
