"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, Search, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { PaginationBar } from "@/components/pagination-bar";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

type Membership = { company_id: string; company_name: string; role_empresa: string; active: boolean; member_id: string };
export type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role_platform: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  banned: boolean;
  memberships: Membership[];
  total_count: number;
};

export function UsuariosView({
  users: initialUsers,
  total,
  page,
  pageSize,
  filters,
  loadError,
}: {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string };
  loadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const supabase = createClient();
  const [q, setQ] = useState(filters.q);
  const [users, setUsers] = useState(initialUsers);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setUsers(initialUsers), [initialUsers]);

  function pushParams(next: Partial<{ q: string; pagina: string }>) {
    const params = new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}) });
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q === filters.q) return;
    debounceRef.current = setTimeout(() => pushParams({ q, pagina: "" }), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function redefinirAcesso(userId: string, email: string | null) {
    if (!email) return;
    setResettingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-user-password", {
        body: { user_id: userId, redirect_to: process.env.NEXT_PUBLIC_WEB_PROFESSIONAL_URL },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "E-mail de redefinição enviado", description: data.email });
    } catch (e) {
      toast({ title: "Erro ao redefinir acesso", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setResettingUserId(null);
    }
  }

  async function alternarAcesso(userId: string, memberId: string, active: boolean) {
    setSavingMemberId(memberId);
    const { error } = await supabase.rpc("admin_set_member_active", { member_id: memberId, new_active: active });
    setSavingMemberId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.user_id !== userId ? u : { ...u, memberships: u.memberships.map((m) => (m.member_id === memberId ? { ...m, active } : m)) }))
    );
    toast({ title: active ? "Acesso reativado" : "Acesso bloqueado" });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">{total} usuário(s) na plataforma</p>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar usuários: {loadError}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.user_id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{u.full_name || "Sem nome"}</p>
                    {u.role_platform === "super_admin" && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-primary/15 text-primary flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Super Admin
                      </span>
                    )}
                  </div>
                  {/* Só o e-mail é exibido — jamais senha/token, que nem chegam a este componente (a RPC não os seleciona). */}
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Último acesso: {u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : "nunca"} · Cadastrado em {formatDateTime(u.created_at)}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled={resettingUserId === u.user_id} onClick={() => redefinirAcesso(u.user_id, u.email)}>
                  {resettingUserId === u.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Redefinir acesso
                </Button>
              </div>

              {u.memberships.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  {u.memberships.map((m) => (
                    <div key={m.member_id} className="flex items-center gap-2 text-xs flex-wrap">
                      <Link href={`/empresas/${m.company_id}`} className="font-medium hover:text-primary">{m.company_name}</Link>
                      <span className="text-muted-foreground capitalize">{m.role_empresa}</span>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-muted-foreground">{m.active ? "Ativo" : "Bloqueado"}</span>
                        <Switch checked={m.active} disabled={savingMemberId === m.member_id} onCheckedChange={(v) => alternarAcesso(u.user_id, m.member_id, v)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {u.memberships.length === 0 && <p className="text-xs text-muted-foreground mt-2">Sem vínculo com nenhuma empresa.</p>}
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum usuário encontrado.
            </CardContent>
          </Card>
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={(p) => pushParams({ pagina: String(p) })} />
    </main>
  );
}
