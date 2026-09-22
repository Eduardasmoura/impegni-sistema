"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CreditCard, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { PaginationBar } from "@/components/pagination-bar";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<string, string> = {
  trial: "Teste", active: "Ativa", past_due: "Pagamento pendente", suspended: "Suspensa", canceled: "Cancelada", expired: "Expirada",
};
const STATUS_COLOR: Record<string, string> = {
  trial: "bg-chart-4/15 text-chart-4", active: "bg-chart-2/15 text-chart-2", past_due: "bg-destructive/15 text-destructive",
  suspended: "bg-destructive/15 text-destructive", canceled: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground",
};
const STATUS_OPTIONS = ["trial", "active", "past_due", "expired", "canceled"] as const;
const ALL = "__all__";

export type SubscriptionRow = Tables<"subscriptions"> & {
  companies: Pick<Tables<"companies">, "id" | "name" | "slug" | "status"> | null;
  plans: Pick<Tables<"plans">, "id" | "name" | "price_cents" | "billing_interval"> | null;
};

export function AssinaturasView({
  subscriptions,
  total,
  page,
  pageSize,
  plans,
  filters,
  loadError,
}: {
  subscriptions: SubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  plans: Pick<Tables<"plans">, "id" | "name">[];
  filters: { q: string; status: string; plano: string };
  loadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Partial<{ q: string; status: string; plano: string; pagina: string }>) {
    const params = new URLSearchParams({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.plano ? { plano: filters.plano } : {}),
    });
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

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">{total} assinatura(s) na plataforma</p>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar assinaturas: {loadError}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por empresa..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <Select value={filters.status || ALL} onValueChange={(v) => pushParams({ status: v === ALL ? "" : v, pagina: "" })}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.plano || ALL} onValueChange={(v) => pushParams({ plano: v === ALL ? "" : v, pagina: "" })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Plano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os planos</SelectItem>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {subscriptions.map((s) => (
          <Link key={s.id} href={`/empresas/${s.company_id}`}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{s.companies?.name ?? "Empresa removida"}</p>
                    <StatusBadge value={s.status} label={STATUS_LABEL[s.status] ?? s.status} color={STATUS_COLOR[s.status]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.plans?.name ?? "Sem plano"} · {s.plans ? formatCurrency(s.plans.price_cents / 100) : "—"}/{s.plans?.billing_interval === "yearly" ? "ano" : "mês"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground text-right shrink-0">
                  {s.status === "trial" && s.trial_ends_at && <p>Teste até {formatDate(s.trial_ends_at)}</p>}
                  {s.current_period_end && <p>Vence em {formatDate(s.current_period_end)}</p>}
                  {s.canceled_at && <p>Cancelada em {formatDate(s.canceled_at)}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {subscriptions.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhuma assinatura encontrada com esses filtros.
            </CardContent>
          </Card>
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={(p) => pushParams({ pagina: String(p) })} />
    </main>
  );
}
