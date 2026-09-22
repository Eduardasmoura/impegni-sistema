"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

function chaveMs(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
function ultimos12Meses(): string[] {
  const meses: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    meses.push(d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }));
  }
  return meses;
}

function BarrasMensais({ dados, corClasse }: { dados: Map<string, number>; corClasse: string }) {
  const meses = ultimos12Meses();
  const max = Math.max(1, ...meses.map((m) => dados.get(m) ?? 0));
  return (
    <div className="flex items-end gap-1.5 h-24 overflow-x-auto">
      {meses.map((mes) => {
        const v = dados.get(mes) ?? 0;
        return (
          <div key={mes} className="flex-1 min-w-[28px] flex flex-col items-center gap-1">
            <div className="w-full bg-muted rounded-t-md relative flex items-end" style={{ height: "64px" }}>
              <div className={`w-full rounded-t-md ${corClasse}`} style={{ height: `${(v / max) * 64}px` }} />
            </div>
            <span className="text-[9px] text-muted-foreground capitalize whitespace-nowrap">{mes}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsView({ payments, subscriptions, companies, topMrr, recentAppointments, nameById, appointmentsSampleCapped, loadError }: {
  payments: { value: number; status: string; payment_date: string | null; due_date: string | null; created_at: string }[];
  subscriptions: { canceled_at: string | null; created_at: string; status: string }[];
  companies: { created_at: string; status: string }[];
  topMrr: Array<{ company_id: string; companies: { name: string } | null; plans: { name: string; price_cents: number; billing_interval: string } | null }>;
  recentAppointments: { company_id: string }[];
  nameById: Record<string, string>;
  appointmentsSampleCapped: boolean;
  loadError?: string;
}) {
  const receitaPorMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(chaveMs(p.payment_date ?? p.due_date ?? p.created_at), (m.get(chaveMs(p.payment_date ?? p.due_date ?? p.created_at)) ?? 0) + Number(p.value));
    return m;
  }, [payments]);

  const novasPorMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of companies) m.set(chaveMs(c.created_at), (m.get(chaveMs(c.created_at)) ?? 0) + 1);
    return m;
  }, [companies]);

  const churnPorMes = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subscriptions) if (s.canceled_at) m.set(chaveMs(s.canceled_at), (m.get(chaveMs(s.canceled_at)) ?? 0) + 1);
    return m;
  }, [subscriptions]);

  const mrrRanking = useMemo(() => {
    return topMrr
      .map((s) => ({
        nome: s.companies?.name ?? "—",
        mrr: s.plans ? (s.plans.billing_interval === "yearly" ? s.plans.price_cents / 12 : s.plans.price_cents) / 100 : 0,
      }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 10);
  }, [topMrr]);

  const usoRanking = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of recentAppointments) m.set(a.company_id, (m.get(a.company_id) ?? 0) + 1);
    return Array.from(m.entries())
      .map(([id, qtd]) => ({ nome: nameById[id] ?? "—", qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);
  }, [recentAppointments, nameById]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Tendências dos últimos 12 meses e rankings entre empresas — complementar ao Dashboard.</p>
      </div>

      {loadError && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar analytics: {loadError}</CardContent></Card>}

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita confirmada / mês</CardTitle></CardHeader>
          <CardContent><BarrasMensais dados={receitaPorMes} corClasse="bg-chart-2" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Novas empresas / mês</CardTitle></CardHeader>
          <CardContent><BarrasMensais dados={novasPorMes} corClasse="bg-primary" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cancelamentos / mês</CardTitle></CardHeader>
          <CardContent><BarrasMensais dados={churnPorMes} corClasse="bg-destructive" /></CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 empresas por MRR</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mrrRanking.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>}
            {mrrRanking.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">{i + 1}. {r.nome}</span>
                <span className="font-semibold shrink-0">{formatCurrency(r.mrr)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 empresas mais ativas (30 dias)</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">Por volume de agendamentos não cancelados{appointmentsSampleCapped ? " — amostra limitada a 5.000 registros" : ""}.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {usoRanking.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento no período.</p>}
            {usoRanking.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate">{i + 1}. {r.nome}</span>
                <span className="font-semibold shrink-0">{r.qtd}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
