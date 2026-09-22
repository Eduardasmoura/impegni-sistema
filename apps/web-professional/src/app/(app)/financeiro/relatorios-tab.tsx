import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { METODO_PAGAMENTO_LABEL } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

const CATEGORIAS_SERVICO_LABEL: Record<string, string> = {
  cabelo: "Cabelo", barba: "Barba", combo: "Combo", estetica: "Estética", unhas: "Unhas", maquiagem: "Maquiagem", outros: "Outros",
};
const CATEGORIAS_DESPESA_LABEL: Record<string, string> = {
  aluguel: "Aluguel", fornecedores: "Fornecedores", salarios: "Salários", marketing: "Marketing", equipamentos: "Equipamentos", impostos: "Impostos", outros: "Outros",
};
const CORES = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function Empty({ text = "Sem dados no período" }: { text?: string }) {
  return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">{text}</div>;
}

/**
 * Relatórios financeiros — indicadores do próprio módulo (não a Central de
 * Relatórios geral do sistema, que fica pra outra etapa). Todos os
 * gráficos vêm do MESMO conjunto de dados já buscado pela Visão geral
 * (`paymentsPeriodo`/`expensesPeriodo`/`appointmentsPeriodo`), sem nenhuma
 * query nova — só reorganizados/computados aqui. "Por categoria de
 * serviço" e "evolução financeira" já existiam (relocados); "por serviço",
 * "por profissional" e "por forma de pagamento" são novos, no mesmo
 * padrão de cálculo já usado no Dashboard.
 */
export function RelatoriosTab({
  paymentsPeriodo,
  expensesPeriodo,
  appointmentsPeriodo,
  services,
  professionals,
  periodoAno,
}: {
  paymentsPeriodo: Tables<"payments">[];
  expensesPeriodo: Tables<"expenses">[];
  appointmentsPeriodo: Tables<"appointments">[];
  services: Tables<"services">[];
  professionals: Tables<"professionals">[];
  periodoAno: boolean;
}) {
  const receitaPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const ag = appointmentsPeriodo.find((a) => a.id === p.appointment_id);
      if (!ag) return;
      const categoria = services.find((s) => s.id === ag.service_id)?.category || "outros";
      totais[categoria] = (totais[categoria] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totais).map(([categoria, valor]) => ({ categoria: CATEGORIAS_SERVICO_LABEL[categoria] || categoria, valor }));
  }, [paymentsPeriodo, appointmentsPeriodo, services]);

  const receitaPorServico = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const ag = appointmentsPeriodo.find((a) => a.id === p.appointment_id);
      if (!ag) return;
      totais[ag.service_id] = (totais[ag.service_id] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totais)
      .map(([id, valor]) => ({ nome: services.find((s) => s.id === id)?.name ?? "Serviço removido", valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [paymentsPeriodo, appointmentsPeriodo, services]);

  const receitaPorProfissional = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const ag = appointmentsPeriodo.find((a) => a.id === p.appointment_id);
      if (!ag) return;
      totais[ag.professional_id] = (totais[ag.professional_id] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totais).map(([id, valor]) => ({ nome: professionals.find((pr) => pr.id === id)?.name.split(" ")[0] ?? "—", valor }));
  }, [paymentsPeriodo, appointmentsPeriodo, professionals]);

  const receitaPorForma = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => { totais[p.method || "outro"] = (totais[p.method || "outro"] || 0) + Number(p.amount || 0); });
    return Object.entries(totais).map(([m, value], i) => ({ name: METODO_PAGAMENTO_LABEL[m] || m, value, fill: CORES[i % CORES.length] }));
  }, [paymentsPeriodo]);

  const despesasPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    expensesPeriodo.forEach((d) => { totais[d.category || "outros"] = (totais[d.category || "outros"] || 0) + Number(d.amount || 0); });
    return Object.entries(totais).map(([c, value], i) => ({ name: CATEGORIAS_DESPESA_LABEL[c] || c, value, fill: CORES[i % CORES.length] }));
  }, [expensesPeriodo]);

  const evolucao = useMemo(() => {
    const pontos: Record<string, { receita: number; despesa: number }> = {};
    const chave = (d: Date) => (periodoAno ? d.toLocaleDateString("pt-BR", { month: "short" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    paymentsPeriodo.forEach((p) => {
      const k = chave(new Date(p.created_at));
      pontos[k] = pontos[k] || { receita: 0, despesa: 0 };
      pontos[k].receita += Number(p.amount || 0);
    });
    expensesPeriodo.forEach((d) => {
      const k = chave(new Date(d.expense_date));
      pontos[k] = pontos[k] || { receita: 0, despesa: 0 };
      pontos[k].despesa += Number(d.amount || 0);
    });
    return Object.entries(pontos).map(([data, v]) => ({ data, ...v, lucro: v.receita - v.despesa }));
  }, [paymentsPeriodo, expensesPeriodo, periodoAno]);

  return (
    <div className="mt-3 space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por serviço</CardTitle></CardHeader>
          <CardContent>
            {receitaPorServico.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={receitaPorServico} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Receita por categoria de serviço</CardTitle></CardHeader>
          <CardContent>
            {receitaPorCategoria.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={receitaPorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="valor" fill="hsl(var(--chart-3))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {professionals.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por profissional</CardTitle></CardHeader>
          <CardContent>
            {receitaPorProfissional.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={receitaPorProfissional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por forma de pagamento</CardTitle></CardHeader>
          <CardContent>
            {receitaPorForma.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={receitaPorForma} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {receitaPorForma.map((m) => <Cell key={m.name} fill={m.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Despesas por categoria</CardTitle></CardHeader>
          <CardContent>
            {despesasPorCategoria.length === 0 ? <Empty text="Nenhuma despesa registrada" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={despesasPorCategoria} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {despesasPorCategoria.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Evolução financeira no período</CardTitle></CardHeader>
        <CardContent>
          {evolucao.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pt-1">
        Relatório de comissão: veja a aba <span className="font-medium">Comissões</span> — o cálculo já existe lá e não foi duplicado aqui.
      </p>
    </div>
  );
}
