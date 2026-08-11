"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<string, string> = {
  trial: "Teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  suspended: "Suspensa",
  canceled: "Cancelada",
  expired: "Expirada",
  deleted: "Excluída",
};
const STATUS_COLOR: Record<string, string> = {
  trial: "bg-chart-4/15 text-chart-4",
  active: "bg-chart-2/15 text-chart-2",
  past_due: "bg-chart-4/15 text-chart-4",
  suspended: "bg-destructive/15 text-destructive",
  canceled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
};
const STATUS_OPTIONS = ["trial", "active", "past_due", "suspended", "canceled", "expired"] as const;
const ALL = "__all__";

export type CompanyRow = Tables<"companies"> & {
  segments: Pick<Tables<"segments">, "name" | "theme_key"> | null;
  subscriptions: (Pick<Tables<"subscriptions">, "status" | "plan_id"> & { plans: Pick<Tables<"plans">, "name"> | null })[];
};

export function EmpresasView({
  companies,
  total,
  page,
  pageSize,
  segments,
  plans,
  filters,
  loadError,
}: {
  companies: CompanyRow[];
  total: number;
  page: number;
  pageSize: number;
  segments: Pick<Tables<"segments">, "id" | "name">[];
  plans: Pick<Tables<"plans">, "id" | "name">[];
  filters: { q: string; status: string; plano: string; segmento: string };
  loadError?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: Partial<{ q: string; status: string; plano: string; segmento: string; pagina: string }>) {
    const params = new URLSearchParams({
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.plano ? { plano: filters.plano } : {}),
      ...(filters.segmento ? { segmento: filters.segmento } : {}),
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">{total} empresa(s) cadastradas na plataforma</p>
        </div>
        <Button asChild>
          <Link href="/empresas/nova">
            <Plus className="w-4 h-4" /> Nova Empresa
          </Link>
        </Button>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar empresas: {loadError}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou slug..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <Select value={filters.status || ALL} onValueChange={(v) => pushParams({ status: v === ALL ? "" : v, pagina: "" })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.segmento || ALL} onValueChange={(v) => pushParams({ segmento: v === ALL ? "" : v, pagina: "" })}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os segmentos</SelectItem>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
        {companies.map((c) => {
          const sub = c.subscriptions?.[0];
          return (
            <Link key={c.id} href={`/empresas/${c.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-heading font-semibold">
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{c.name}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[c.status] ?? ""}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      /{c.slug} · {c.segments?.name ?? "—"} · desde {formatDate(c.created_at)}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground shrink-0">{sub?.plans?.name ?? "Sem plano"}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {companies.length === 0 && !loadError && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhuma empresa encontrada com esses filtros.
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => pushParams({ pagina: String(page - 1) })}>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => pushParams({ pagina: String(page + 1) })}>
            Próxima <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </main>
  );
}
