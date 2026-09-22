"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

type Summary = Database["public"]["Functions"]["admin_dashboard_summary"]["Returns"][number];
type PorPlano = Database["public"]["Functions"]["admin_companies_by_plan"]["Returns"][number];

const ROWS: { key: keyof Summary; label: string; money?: boolean }[] = [
  { key: "total_companies", label: "Total de empresas" },
  { key: "active_companies", label: "Empresas ativas" },
  { key: "trial_companies", label: "Empresas em teste" },
  { key: "trial_expired_companies", label: "Trials expirados" },
  { key: "suspended_companies", label: "Empresas bloqueadas" },
  { key: "deleted_companies", label: "Empresas excluídas" },
  { key: "new_companies_period", label: "Novas empresas no período" },
  { key: "active_subscriptions", label: "Assinaturas ativas" },
  { key: "trial_subscriptions", label: "Assinaturas em teste" },
  { key: "past_due_subscriptions", label: "Assinaturas com pagamento atrasado" },
  { key: "canceled_subscriptions", label: "Assinaturas canceladas" },
  { key: "expired_subscriptions", label: "Assinaturas expiradas" },
  { key: "payments_confirmed", label: "Pagamentos aprovados (período)" },
  { key: "payments_pending", label: "Pagamentos pendentes" },
  { key: "payments_overdue", label: "Pagamentos atrasados" },
  { key: "revenue_period", label: "Receita do período", money: true },
  { key: "mrr", label: "MRR (receita recorrente mensal)", money: true },
];

export function RelatoriosView({ summary, porPlano, de, ate, loadError }: { summary: Summary | null; porPlano: PorPlano[]; de: string; ate: string; loadError?: string }) {
  const router = useRouter();
  const [rangeDe, setRangeDe] = useState(de);
  const [rangeAte, setRangeAte] = useState(ate);

  function aplicar() {
    router.push(`/relatorios?de=${rangeDe}&ate=${rangeAte}`);
  }

  function exportarCsv() {
    if (!summary) return;
    const linhas = [
      "metrica,valor",
      ...ROWS.map((r) => `"${r.label}",${summary[r.key]}`),
      ...porPlano.map((p) => `"Empresas no plano ${p.plan_name}",${p.company_count}`),
    ];
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-inovaflow-${de}-a-${ate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Todos os números vêm direto do banco — nada é simulado.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarRange className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Input type="date" value={rangeDe} max={rangeAte} onChange={(e) => setRangeDe(e.target.value)} className="w-auto" />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={rangeAte} min={rangeDe} onChange={(e) => setRangeAte(e.target.value)} className="w-auto" />
          <Button size="sm" onClick={aplicar}>Aplicar</Button>
          <Button size="sm" variant="outline" onClick={exportarCsv} disabled={!summary}>
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">Erro ao carregar relatório: {loadError}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Resumo do período</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {ROWS.map((r) => (
              <div key={r.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium font-heading tabular-nums">{summary ? (r.money ? formatCurrency(Number(summary[r.key])) : summary[r.key]) : "—"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Empresas por plano</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {porPlano.map((p) => (
              <div key={p.plan_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{p.plan_name}</span>
                <span className="font-medium font-heading tabular-nums">{p.company_count}</span>
              </div>
            ))}
            {porPlano.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum plano cadastrado.</p>}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
