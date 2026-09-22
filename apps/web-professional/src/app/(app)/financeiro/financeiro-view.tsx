"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, X as XIcon, LayoutGrid, TrendingUp, Receipt, CreditCard, ArrowLeftRight, HandCoins, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { VisaoGeralTab } from "./visao-geral-tab";
import { ReceitasTab } from "./receitas-tab";
import { DespesasTab } from "./despesas-tab";
import { PagamentosTab } from "./pagamentos-tab";
import { FluxoCaixaTab } from "./fluxo-caixa-tab";
import { ComissoesTab } from "./comissoes-tab";
import { RelatoriosTab } from "./relatorios-tab";

const PERIODOS = [
  { key: "mes", label: "Este mês" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Ano" },
] as const;
type Periodo = (typeof PERIODOS)[number]["key"];

/**
 * Financeiro — Etapa 3 da reformulação do painel. Estrutura de módulo
 * (7 abas) em vez de uma página só com "Visão geral"/"Repasse". O
 * carregamento de dados do PERÍODO (payments/appointments/expenses/
 * services/professionals) continua aqui no orquestrador, exatamente como
 * já era — só passado pras abas que precisam (Visão geral, Fluxo de caixa,
 * Relatórios, Despesas). Receitas/Pagamentos têm sua PRÓPRIA busca
 * paginada (RPC `list_company_payments`, migration 20260914160000) porque
 * são telas de navegar linha a linha, não de agregado — não faz sentido
 * paginar um gráfico, e não faz sentido carregar 1000 linhas só pra somar.
 */
export function FinanceiroView({ companyId }: { companyId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [filtroServicoId, setFiltroServicoId] = useState("all");
  const [filtroProfissionalId, setFiltroProfissionalId] = useState("all");
  const [categoriaDespesa, setCategoriaDespesa] = useState("all");
  const supabase = createClient();

  const { data: payments = [], isLoading: carregandoPayments, isError: erroPayments } = useQuery({
    queryKey: ["payments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Tables<"payments">[];
    },
  });
  const { data: appointments = [], isLoading: carregandoAppointments, isError: erroAppointments } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId).order("scheduled_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: services = [], isLoading: carregandoServices, isError: erroServices } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: expenses = [], isLoading: carregandoExpenses, isError: erroExpenses } = useQuery({
    queryKey: ["expenses", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").eq("company_id", companyId).order("expense_date", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Tables<"expenses">[];
    },
  });
  const { data: professionals = [], isLoading: carregandoProfessionals, isError: erroProfessionals } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  const carregandoGeral = carregandoPayments || carregandoAppointments || carregandoServices || carregandoExpenses || carregandoProfessionals;
  const erroGeral = erroPayments || erroAppointments || erroServices || erroExpenses || erroProfessionals;

  const intervalo = useMemo(() => {
    if (dataDe && dataAte) return { inicio: new Date(`${dataDe}T00:00:00`), fim: new Date(`${dataAte}T23:59:59`) };
    const inicio = new Date();
    if (periodo === "mes") inicio.setMonth(inicio.getMonth() - 1);
    if (periodo === "trimestre") inicio.setMonth(inicio.getMonth() - 3);
    if (periodo === "ano") inicio.setFullYear(inicio.getFullYear() - 1);
    return { inicio, fim: new Date() };
  }, [periodo, dataDe, dataAte]);

  const semFiltroAtendimento = filtroServicoId === "all" && filtroProfissionalId === "all";
  const appointmentIdsFiltrados = useMemo(() => {
    if (semFiltroAtendimento) return null;
    return new Set(appointments.filter((a) => (filtroServicoId === "all" || a.service_id === filtroServicoId) && (filtroProfissionalId === "all" || a.professional_id === filtroProfissionalId)).map((a) => a.id));
  }, [appointments, filtroServicoId, filtroProfissionalId, semFiltroAtendimento]);

  // Todos os status (pra "receita bruta"/"pendente") — filtro de
  // serviço/profissional ainda se aplica, status não.
  const paymentsPeriodoTodos = useMemo(
    () => payments.filter((p) => {
      const d = new Date(p.created_at);
      if (d < intervalo.inicio || d > intervalo.fim) return false;
      return semFiltroAtendimento || (p.appointment_id != null && appointmentIdsFiltrados!.has(p.appointment_id));
    }),
    [payments, intervalo, semFiltroAtendimento, appointmentIdsFiltrados]
  );
  // Só "paid" (pra "receita recebida", gráficos e fluxo de caixa) — mesmo
  // recorte que a tela antiga já usava como "receita total".
  const paymentsPeriodo = useMemo(() => paymentsPeriodoTodos.filter((p) => p.status === "paid"), [paymentsPeriodoTodos]);
  const expensesPeriodo = useMemo(() => expenses.filter((d) => new Date(d.expense_date) >= intervalo.inicio && new Date(d.expense_date) <= intervalo.fim), [expenses, intervalo]);

  const filtrosAtivos = Boolean(dataDe && dataAte) || filtroServicoId !== "all" || filtroProfissionalId !== "all";
  function limparFiltros() {
    setDataDe(""); setDataAte(""); setFiltroServicoId("all"); setFiltroProfissionalId("all");
  }

  const receitaBruta = paymentsPeriodoTodos.reduce((s, p) => s + Number(p.amount || 0), 0);
  const receitaRecebida = paymentsPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendente = paymentsPeriodoTodos.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + Number(p.amount || 0), 0);
  const despesaTotal = expensesPeriodo.reduce((s, d) => s + Number(d.amount || 0), 0);
  const lucro = receitaRecebida - despesaTotal;
  const concluidosPeriodo = useMemo(
    () => appointments.filter((a) => a.status === "completed" && new Date(a.scheduled_at) >= intervalo.inicio && new Date(a.scheduled_at) <= intervalo.fim).length,
    [appointments, intervalo]
  );
  const ticketMedio = concluidosPeriodo > 0 ? receitaRecebida / concluidosPeriodo : null;

  // Comissão do período — soma de `calculate_professional_payout` (MESMA
  // RPC da aba Comissões) por profissional ativo. Reaproveita a regra de
  // cálculo já existente em vez de recalcular comissão na mão aqui.
  const { data: comissaoPeriodo } = useQuery({
    queryKey: ["comissao-periodo", companyId, professionals.map((p) => p.id).join(","), intervalo.inicio.toISOString(), intervalo.fim.toISOString()],
    enabled: professionals.length > 0,
    queryFn: async () => {
      const inicio = intervalo.inicio.toISOString().slice(0, 10);
      const fim = intervalo.fim.toISOString().slice(0, 10);
      const resultados = await Promise.all(
        professionals.map((p) =>
          supabase.rpc("calculate_professional_payout", { p_company_id: companyId, p_professional_id: p.id, p_period_start: inicio, p_period_end: fim })
        )
      );
      if (resultados.some((r) => r.error)) return null;
      return resultados.reduce((s, r) => s + Number(r.data?.[0]?.total_commission || 0), 0);
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas, pagamentos e comissões do seu negócio</p>
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

      {carregandoGeral ? (
        <LoadingState text="Carregando dados financeiros..." />
      ) : erroGeral ? (
        <ErrorState message="Não foi possível carregar os dados financeiros." />
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium">Filtros do período</span>
                  <p className="text-xs text-muted-foreground">Afetam Visão geral, Fluxo de caixa e Relatórios</p>
                </div>
                {filtrosAtivos && (
                  <button onClick={limparFiltros} className="ml-auto text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0">
                    <XIcon className="w-3 h-3" /> Limpar filtros
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="filtro-data-de" className="text-xs">De</Label>
                  <Input id="filtro-data-de" type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="filtro-data-ate" className="text-xs">Até</Label>
                  <Input id="filtro-data-ate" type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Serviço</Label>
                  <Select value={filtroServicoId} onValueChange={setFiltroServicoId}>
                    <SelectTrigger aria-label="Filtrar por serviço"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os serviços</SelectItem>
                      {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Profissional</Label>
                  <Select value={filtroProfissionalId} onValueChange={setFiltroProfissionalId}>
                    <SelectTrigger aria-label="Filtrar por profissional"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os profissionais</SelectItem>
                      {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="geral">
            <TabsList className="mb-2 flex-wrap h-auto">
              <TabsTrigger value="geral" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> Visão geral</TabsTrigger>
              <TabsTrigger value="receitas" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Receitas</TabsTrigger>
              <TabsTrigger value="despesas" className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> Despesas</TabsTrigger>
              <TabsTrigger value="pagamentos" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Pagamentos</TabsTrigger>
              <TabsTrigger value="fluxo" className="gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5" /> Fluxo de caixa</TabsTrigger>
              <TabsTrigger value="comissoes" className="gap-1.5"><HandCoins className="w-3.5 h-3.5" /> Comissões</TabsTrigger>
              <TabsTrigger value="relatorios" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Relatórios</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <VisaoGeralTab
                receitaBruta={receitaBruta}
                receitaRecebida={receitaRecebida}
                despesas={despesaTotal}
                comissoes={comissaoPeriodo ?? null}
                lucro={lucro}
                ticketMedio={ticketMedio}
                pendente={pendente}
              />
            </TabsContent>

            <TabsContent value="receitas">
              <ReceitasTab companyId={companyId} professionals={professionals} services={services} />
            </TabsContent>

            <TabsContent value="despesas">
              <DespesasTab companyId={companyId} expensesPeriodo={expensesPeriodo} categoriaFiltro={categoriaDespesa} onCategoriaFiltroChange={setCategoriaDespesa} />
            </TabsContent>

            <TabsContent value="pagamentos">
              <PagamentosTab companyId={companyId} professionals={professionals} services={services} />
            </TabsContent>

            <TabsContent value="fluxo">
              <FluxoCaixaTab paymentsPeriodo={paymentsPeriodo} expensesPeriodo={expensesPeriodo} />
            </TabsContent>

            <TabsContent value="comissoes">
              <ComissoesTab companyId={companyId} />
            </TabsContent>

            <TabsContent value="relatorios">
              <RelatoriosTab
                paymentsPeriodo={paymentsPeriodo}
                expensesPeriodo={expensesPeriodo}
                appointmentsPeriodo={appointments}
                services={services}
                professionals={professionals}
                periodoAno={periodo === "ano" && !dataDe && !dataAte}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
