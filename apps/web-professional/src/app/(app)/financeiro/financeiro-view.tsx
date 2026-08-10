"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Wallet, Percent, Plus, Trash2, Receipt, Filter, X as XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const PERIODOS = [
  { key: "mes", label: "Este mês" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Ano" },
] as const;
type Periodo = (typeof PERIODOS)[number]["key"];

const CATEGORIAS_DESPESA = [
  { value: "aluguel", label: "Aluguel" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "salarios", label: "Salários" },
  { value: "marketing", label: "Marketing" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "impostos", label: "Impostos" },
  { value: "outros", label: "Outros" },
];

const CATEGORIAS_SERVICO_LABEL: Record<string, string> = {
  cabelo: "Cabelo", barba: "Barba", combo: "Combo", estetica: "Estética", unhas: "Unhas", maquiagem: "Maquiagem", outros: "Outros",
};

const CORES_GRAFICO = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const DESPESA_VAZIA = { description: "", amount: "", category: "outros", expense_date: new Date().toISOString().slice(0, 10), recurring: false, notes: "" };

export function FinanceiroView({ companyId }: { companyId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [filtroServicoId, setFiltroServicoId] = useState("all");
  const [filtroProfissionalId, setFiltroProfissionalId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState(DESPESA_VAZIA);
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tables<"payments">[];
    },
  });
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId).order("scheduled_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("company_id", companyId).order("expense_date", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tables<"expenses">[];
    },
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  // Data personalizada (De/Até) tem prioridade sobre os atalhos de período;
  // sem nenhuma das duas, cai no período selecionado (mês/trimestre/ano).
  const intervalo = useMemo(() => {
    if (dataDe && dataAte) {
      return { inicio: new Date(`${dataDe}T00:00:00`), fim: new Date(`${dataAte}T23:59:59`) };
    }
    const inicio = new Date();
    if (periodo === "mes") inicio.setMonth(inicio.getMonth() - 1);
    if (periodo === "trimestre") inicio.setMonth(inicio.getMonth() - 3);
    if (periodo === "ano") inicio.setFullYear(inicio.getFullYear() - 1);
    return { inicio, fim: new Date() };
  }, [periodo, dataDe, dataAte]);

  // Agendamentos que batem com os filtros de serviço/profissional — usado
  // pra restringir os pagamentos (a receita) a esse recorte. Despesas não
  // têm serviço/profissional associado, então só respeitam o período.
  const semFiltroAtendimento = filtroServicoId === "all" && filtroProfissionalId === "all";
  const appointmentIdsFiltrados = useMemo(() => {
    if (semFiltroAtendimento) return null;
    return new Set(
      appointments
        .filter((a) => (filtroServicoId === "all" || a.service_id === filtroServicoId) && (filtroProfissionalId === "all" || a.professional_id === filtroProfissionalId))
        .map((a) => a.id)
    );
  }, [appointments, filtroServicoId, filtroProfissionalId, semFiltroAtendimento]);

  const paymentsPeriodo = payments.filter((p) => {
    const dentroDoPeriodo = new Date(p.created_at) >= intervalo.inicio && new Date(p.created_at) <= intervalo.fim && p.status === "paid";
    if (!dentroDoPeriodo) return false;
    return semFiltroAtendimento || (p.appointment_id != null && appointmentIdsFiltrados!.has(p.appointment_id));
  });
  const expensesPeriodo = expenses.filter((d) => new Date(d.expense_date) >= intervalo.inicio && new Date(d.expense_date) <= intervalo.fim);

  const filtrosAtivos = Boolean(dataDe && dataAte) || filtroServicoId !== "all" || filtroProfissionalId !== "all";
  function limparFiltros() {
    setDataDe("");
    setDataAte("");
    setFiltroServicoId("all");
    setFiltroProfissionalId("all");
  }

  const receitaTotal = paymentsPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const despesaTotal = expensesPeriodo.reduce((s, d) => s + Number(d.amount || 0), 0);
  const lucro = receitaTotal - despesaTotal;
  const margem = receitaTotal > 0 ? Math.round((lucro / receitaTotal) * 100) : 0;

  const receitaPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const appointment = appointments.find((a) => a.id === p.appointment_id);
      if (!appointment) return;
      const service = services.find((s) => s.id === appointment.service_id);
      const categoria = service?.category || "outros";
      totais[categoria] = (totais[categoria] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totais).map(([categoria, valor]) => ({ categoria: CATEGORIAS_SERVICO_LABEL[categoria] || categoria, valor }));
  }, [paymentsPeriodo, appointments, services]);

  const despesasPorCategoria = useMemo(() => {
    const totais: Record<string, number> = {};
    expensesPeriodo.forEach((d) => {
      const categoria = d.category || "outros";
      totais[categoria] = (totais[categoria] || 0) + Number(d.amount || 0);
    });
    return Object.entries(totais).map(([categoria, valor], i) => ({
      name: CATEGORIAS_DESPESA.find((c) => c.value === categoria)?.label || categoria,
      value: valor,
      fill: CORES_GRAFICO[i % CORES_GRAFICO.length],
    }));
  }, [expensesPeriodo]);

  const serieLucro = useMemo(() => {
    const pontos: Record<string, { receita: number; despesa: number }> = {};
    const chaveDaData = (date: Date) =>
      periodo === "ano" ? date.toLocaleDateString("pt-BR", { month: "short" }) : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    paymentsPeriodo.forEach((p) => {
      const chave = chaveDaData(new Date(p.created_at));
      pontos[chave] = pontos[chave] || { receita: 0, despesa: 0 };
      pontos[chave].receita += Number(p.amount || 0);
    });
    expensesPeriodo.forEach((d) => {
      const chave = chaveDaData(new Date(d.expense_date));
      pontos[chave] = pontos[chave] || { receita: 0, despesa: 0 };
      pontos[chave].despesa += Number(d.amount || 0);
    });
    return Object.entries(pontos).map(([data, v]) => ({ data, ...v, lucro: v.receita - v.despesa }));
  }, [paymentsPeriodo, expensesPeriodo, periodo]);

  async function salvarDespesa() {
    if (!novaDespesa.description || !novaDespesa.amount || !novaDespesa.expense_date) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("expenses").insert({
      company_id: companyId,
      description: novaDespesa.description,
      amount: parseFloat(novaDespesa.amount),
      category: novaDespesa.category,
      expense_date: novaDespesa.expense_date,
      recurring: novaDespesa.recurring,
      notes: novaDespesa.notes || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["expenses", companyId] });
    setDialogOpen(false);
    setNovaDespesa(DESPESA_VAZIA);
    toast({ title: "Despesa registrada" });
  }

  async function excluirDespesa(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["expenses", companyId] });
    toast({ title: "Despesa excluída" });
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas e margem de lucro</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriodo(p.key); setDataDe(""); setDataAte(""); }}
              className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", periodo === p.key && !dataDe && !dataAte ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
            {filtrosAtivos && (
              <button onClick={limparFiltros} className="ml-auto text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                <XIcon className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Serviço</Label>
              <Select value={filtroServicoId} onValueChange={setFiltroServicoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os serviços</SelectItem>
                  {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Profissional</Label>
              <Select value={filtroProfissionalId} onValueChange={setFiltroProfissionalId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(filtroServicoId !== "all" || filtroProfissionalId !== "all") && (
            <p className="text-xs text-muted-foreground mt-3">
              Filtro de serviço/profissional se aplica só à receita — despesas não têm serviço/profissional associado.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={TrendingUp} label="Receita total" value={formatCurrency(receitaTotal)} color="text-primary" />
        <KpiCard icon={TrendingDown} label="Despesas" value={formatCurrency(despesaTotal)} color="text-destructive" />
        <KpiCard icon={Wallet} label="Lucro líquido" value={formatCurrency(lucro)} color={lucro >= 0 ? "text-chart-2" : "text-destructive"} />
        <KpiCard icon={Percent} label="Margem" value={`${margem}%`} color="text-chart-4" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Receita por categoria de serviço</CardTitle></CardHeader>
          <CardContent>
            {receitaPorCategoria.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={receitaPorCategoria} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Despesas por categoria</CardTitle></CardHeader>
          <CardContent>
            {despesasPorCategoria.length === 0 ? <Empty text="Nenhuma despesa registrada" /> : (
              <ResponsiveContainer width="100%" height={260}>
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

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Receita, despesas e lucro no período</CardTitle></CardHeader>
        <CardContent>
          {serieLucro.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serieLucro}>
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

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" /> Despesas registradas</CardTitle>
          <Button size="sm" className="gap-1" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" /> Nova despesa</Button>
        </CardHeader>
        <CardContent>
          {expensesPeriodo.length === 0 ? (
            <Empty text='Nenhuma despesa no período. Clique em "Nova despesa" para começar.' />
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {expensesPeriodo.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORIAS_DESPESA.find((c) => c.value === d.category)?.label || d.category} · {formatDate(d.expense_date)}
                      {d.recurring && " · Recorrente"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{formatCurrency(Number(d.amount))}</span>
                  <button onClick={() => excluirDespesa(d.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar despesa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Descrição *</Label>
              <Input value={novaDespesa.description} onChange={(e) => setNovaDespesa({ ...novaDespesa, description: e.target.value })} placeholder="Ex: Conta de luz" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor *</Label>
                <CurrencyInput value={novaDespesa.amount} onValueChange={(v) => setNovaDespesa({ ...novaDespesa, amount: v })} />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={novaDespesa.expense_date} onChange={(e) => setNovaDespesa({ ...novaDespesa, expense_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={novaDespesa.category} onValueChange={(v) => setNovaDespesa({ ...novaDespesa, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={novaDespesa.notes} onChange={(e) => setNovaDespesa({ ...novaDespesa, notes: e.target.value })} rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={novaDespesa.recurring} onChange={(e) => setNovaDespesa({ ...novaDespesa, recurring: e.target.checked })} className="rounded" />
              Despesa recorrente
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvarDespesa}>Salvar despesa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <p className="font-heading text-2xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ text = "Sem dados no período" }: { text?: string }) {
  return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">{text}</div>;
}
