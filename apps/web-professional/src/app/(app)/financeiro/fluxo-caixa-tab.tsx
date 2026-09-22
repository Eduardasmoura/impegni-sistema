import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const GRANULARIDADES = [
  { key: "dia", label: "Diário" },
  { key: "semana", label: "Semanal" },
  { key: "mes", label: "Mensal" },
] as const;
type Granularidade = (typeof GRANULARIDADES)[number]["key"];

function chaveAgrupamento(date: Date, g: Granularidade): string {
  if (g === "mes") return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  if (g === "semana") {
    // Semana ISO simplificada: segunda-feira daquela semana como rótulo —
    // suficiente pra "ler rápido", não precisa do número oficial da semana.
    const seg = new Date(date);
    const dia = seg.getDay();
    seg.setDate(seg.getDate() - ((dia + 6) % 7));
    return `sem. ${seg.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Fluxo de caixa — entradas (pagamentos recebidos) × saídas (despesas),
 * com seletor de granularidade próprio (não depende do período principal
 * do Financeiro, só reagrupa o MESMO dado já carregado). Deliberadamente
 * simples: 1 gráfico, 3 números — nada de dashboard cheio de indicador.
 */
export function FluxoCaixaTab({ paymentsPeriodo, expensesPeriodo }: { paymentsPeriodo: Tables<"payments">[]; expensesPeriodo: Tables<"expenses">[] }) {
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");

  const totalEntradas = paymentsPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalSaidas = expensesPeriodo.reduce((s, d) => s + Number(d.amount || 0), 0);
  const resultado = totalEntradas - totalSaidas;

  const serie = useMemo(() => {
    const pontos: Record<string, { entrada: number; saida: number }> = {};
    paymentsPeriodo.forEach((p) => {
      const k = chaveAgrupamento(new Date(p.created_at), granularidade);
      pontos[k] = pontos[k] || { entrada: 0, saida: 0 };
      pontos[k].entrada += Number(p.amount || 0);
    });
    expensesPeriodo.forEach((d) => {
      const k = chaveAgrupamento(new Date(d.expense_date), granularidade);
      pontos[k] = pontos[k] || { entrada: 0, saida: 0 };
      pontos[k].saida += Number(d.amount || 0);
    });
    return Object.entries(pontos).map(([data, v]) => ({ data, ...v, resultado: v.entrada - v.saida }));
  }, [paymentsPeriodo, expensesPeriodo, granularidade]);

  return (
    <div className="mt-3 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ArrowUpCircle className="w-3.5 h-3.5 text-chart-2" /> Entradas</p>
            <p className="font-heading text-xl sm:text-2xl font-bold mt-1.5 text-chart-2 tabular-nums">{formatCurrency(totalEntradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><ArrowDownCircle className="w-3.5 h-3.5 text-destructive" /> Saídas</p>
            <p className="font-heading text-xl sm:text-2xl font-bold mt-1.5 text-destructive tabular-nums">{formatCurrency(totalSaidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-primary" /> Resultado</p>
            <p className={cn("font-heading text-xl sm:text-2xl font-bold mt-1.5 tabular-nums", resultado >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(resultado)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
          <CardTitle className="text-base">Entradas × saídas</CardTitle>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {GRANULARIDADES.map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularidade(g.key)}
                className={cn("px-2.5 py-1 rounded-md text-xs transition-colors", granularidade === g.key ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}
              >
                {g.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {serie.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="entrada" name="Entradas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
