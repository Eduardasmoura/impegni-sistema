"use client";

// Financeiro DESTA EMPRESA (receita de agendamentos/clientes + despesas) —
// deliberadamente separado do Financeiro da Plataforma (Impegni cobrando a
// empresa pela assinatura, que mora em /pagamentos e usa
// `subscription_payments`, não tocado aqui). Fonte de dados: `payments` e
// `expenses`, ambas com RLS já permitindo is_super_admin() (confirmado na
// auditoria) — nenhuma migration necessária.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, TrendingDown, Wallet, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { ProfessionalRow } from "./empresa-detail-view";

const PAYMENT_STATUS_LABEL: Record<string, string> = { pending: "Pendente", paid: "Pago", refunded: "Estornado", overdue: "Atrasado", canceled: "Cancelado" };

function inicioMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function fimMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function FinanceiroTab({ companyId, professionals }: { companyId: string; professionals: ProfessionalRow[] }) {
  const supabase = createClient();
  const [de, setDe] = useState(inicioMesISO());
  const [ate, setAte] = useState(fimMesISO());
  const [profissionalId, setProfissionalId] = useState(professionals[0]?.id ?? "");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-financeiro-empresa", companyId, de, ate],
    queryFn: async () => {
      const [{ data: payments, error: e1 }, { data: expenses, error: e2 }] = await Promise.all([
        supabase.from("payments").select("id, amount, method, status, created_at").eq("company_id", companyId).gte("created_at", `${de}T00:00:00Z`).lte("created_at", `${ate}T23:59:59Z`),
        supabase.from("expenses").select("id, description, amount, category, expense_date").eq("company_id", companyId).gte("expense_date", de).lte("expense_date", ate),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { payments: payments ?? [], expenses: expenses ?? [] };
    },
  });

  const { data: payout, isFetching: payoutLoading } = useQuery({
    queryKey: ["admin-payout-preview", companyId, profissionalId, de, ate],
    enabled: !!profissionalId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_professional_payout", {
        p_company_id: companyId, p_professional_id: profissionalId, p_period_start: de, p_period_end: ate,
      });
      if (error) throw error;
      return data?.[0] ?? { total_appointments: 0, total_revenue: 0, total_commission: 0 };
    },
  });

  const resumo = useMemo(() => {
    const payments = data?.payments ?? [];
    const expenses = data?.expenses ?? [];
    const receita = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const despesas = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
    const porMetodo: Record<string, number> = {};
    for (const p of payments.filter((p) => p.status === "paid")) porMetodo[p.method ?? "—"] = (porMetodo[p.method ?? "—"] ?? 0) + Number(p.amount ?? 0);
    const porCategoria: Record<string, number> = {};
    for (const e of expenses) porCategoria[e.category ?? "Sem categoria"] = (porCategoria[e.category ?? "Sem categoria"] ?? 0) + Number(e.amount ?? 0);
    return { receita, despesas, saldo: receita - despesas, porMetodo, porCategoria };
  }, [data]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Financeiro <strong className="text-foreground">da empresa</strong> (receita de atendimentos e despesas operacionais dela). A cobrança que a Impegni faz desta empresa pela assinatura fica em <span className="font-mono">Pagamentos</span>, no menu principal.</p>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </CardContent>
      </Card>

      {error && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar financeiro: {(error as Error).message}</CardContent></Card>}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Receita (pagamentos pagos)</p><p className="text-xl font-bold font-heading mt-1 text-chart-2">{formatCurrency(resumo.receita)}</p></div><TrendingUp className="w-5 h-5 text-chart-2" /></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Despesas</p><p className="text-xl font-bold font-heading mt-1 text-destructive">{formatCurrency(resumo.despesas)}</p></div><TrendingDown className="w-5 h-5 text-destructive" /></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-xl font-bold font-heading mt-1 ${resumo.saldo >= 0 ? "text-chart-2" : "text-destructive"}`}>{formatCurrency(resumo.saldo)}</p></div><Wallet className="w-5 h-5 text-muted-foreground" /></CardContent></Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Receita por método de pagamento</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(resumo.porMetodo).length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento pago no período.</p>}
                {Object.entries(resumo.porMetodo).map(([metodo, valor]) => (
                  <div key={metodo} className="flex items-center justify-between text-sm"><span className="capitalize">{metodo}</span><span className="font-semibold">{formatCurrency(valor)}</span></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Despesas por categoria</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(resumo.porCategoria).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma despesa lançada no período.</p>}
                {Object.entries(resumo.porCategoria).map(([cat, valor]) => (
                  <div key={cat} className="flex items-center justify-between text-sm"><span>{cat}</span><span className="font-semibold">{formatCurrency(valor)}</span></div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Repasse por profissional (comissão)</CardTitle></CardHeader>
            <CardContent>
              {professionals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {payoutLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : payout ? (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Atendimentos</p><p className="font-semibold">{payout.total_appointments}</p></div>
                      <div><p className="text-xs text-muted-foreground">Receita gerada</p><p className="font-semibold">{formatCurrency(payout.total_revenue)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Comissão devida</p><p className="font-semibold">{formatCurrency(payout.total_commission)}</p></div>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Cálculo via a mesma função (`calculate_professional_payout`) usada pela empresa — fechamento/pagamento do período continua sendo feito no painel dela.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
