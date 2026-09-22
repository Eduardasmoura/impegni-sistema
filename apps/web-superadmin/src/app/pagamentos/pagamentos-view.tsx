"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Receipt, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { PaginationBar } from "@/components/pagination-bar";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", received: "Recebido", overdue: "Atrasado", refunded: "Estornado", deleted: "Removido",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-chart-4/15 text-chart-4", confirmed: "bg-chart-2/15 text-chart-2", received: "bg-chart-2/15 text-chart-2",
  overdue: "bg-destructive/15 text-destructive", refunded: "bg-muted text-muted-foreground", deleted: "bg-muted text-muted-foreground",
};
const STATUS_OPTIONS = ["pending", "confirmed", "received", "overdue", "refunded"] as const;
const ALL = "__all__";

export type PaymentRow = Tables<"subscription_payments"> & {
  companies: Pick<Tables<"companies">, "id" | "name" | "slug"> | null;
  subscriptions: (Pick<Tables<"subscriptions">, "id" | "plan_id"> & { plans: Pick<Tables<"plans">, "name"> | null }) | null;
};

export function PagamentosView({
  payments,
  total,
  page,
  pageSize,
  filters,
  loadError,
}: {
  payments: PaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: string };
  loadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Partial<{ q: string; status: string; pagina: string }>) {
    const params = new URLSearchParams({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {}),
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
        <h1 className="font-heading text-3xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          {total} pagamento(s) recebidos via webhook do Asaas — fonte de verdade é sempre o gateway, nunca o frontend.
        </p>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar pagamentos: {loadError}</CardContent>
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
        </CardContent>
      </Card>

      <div className="space-y-3">
        {payments.map((p) => (
          <Link key={p.id} href={`/empresas/${p.company_id}`}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{p.companies?.name ?? "Empresa removida"}</p>
                    <StatusBadge value={p.status} label={STATUS_LABEL[p.status] ?? p.status} color={STATUS_COLOR[p.status]} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.subscriptions?.plans?.name ?? "—"} · {p.billing_type ?? "—"} · <span className="font-mono">{p.asaas_payment_id}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-heading font-semibold">{formatCurrency(Number(p.value))}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.payment_date ? `pago ${formatDateTime(p.payment_date)}` : p.due_date ? `vence ${formatDate(p.due_date)}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {payments.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum pagamento registrado ainda.
            </CardContent>
          </Card>
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={(p) => pushParams({ pagina: String(p) })} />
    </main>
  );
}
