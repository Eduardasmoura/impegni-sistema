"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { DollarSign, CalendarDays, Users, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { DEFAULT_FILTERS, resolvePeriodRange, resolvePreviousPeriodRange, countActiveFilters, type DashboardFilters, type Periodo } from "./filters";
import { FiltersBar } from "./filters-bar";
import { AdvancedFiltersDialog } from "./advanced-filters-dialog";
import { SetupGuide, type SetupProgress } from "@/components/setup-guide";
import { QuickActions } from "./quick-actions";
import { TodayOverview } from "./today-overview";
import { AgendaTodayCard } from "./agenda-today-card";
import { ClientsSummaryCard, TeamSummaryCard, ServicesSummaryCard } from "./summary-cards";
import { AlertsPanel, type Alerta } from "./alerts-panel";
import { RecentClientsCard } from "./recent-clients-card";
import { RecentActivityCard, type AtividadeItem } from "./recent-activity-card";
import type { Tables } from "@/lib/supabase/database.types";
import Link from "next/link";

const HORAS_EXPEDIENTE_POR_PERIODO: Record<Periodo, number> = {
  hoje: 8, ontem: 8,
  semana: 56, semana_passada: 56,
  mes: 240, mes_passado: 240,
  ano: 2880, ano_passado: 2880,
  personalizado: 8,
};
const CORES_METODO: Record<string, string> = { pix: "hsl(var(--chart-1))", card: "hsl(var(--chart-2))", cash: "hsl(var(--chart-4))" };
const ALERTA_ASSINATURA_DIAS = 5;

type SubscriptionInfo = { status: string; trial_ends_at: string | null; current_period_end: string | null } | null;

export function DashboardView({
  companyId,
  fullName,
  setup,
  subscription,
}: {
  companyId: string;
  fullName: string | null;
  setup: SetupProgress;
  subscription: SubscriptionInfo;
}) {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();
  const supabase = createClient();

  const { start, end } = useMemo(() => resolvePeriodRange(filters), [filters]);
  const { start: prevStart, end: prevEnd } = useMemo(() => resolvePreviousPeriodRange({ start, end }), [start, end]);
  const hoje = useMemo(() => new Date(), []);

  const { data: appointments = [], isLoading: loadingAppointments, isError: errorAppointments } = useQuery({
    queryKey: ["appointments", companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId)
        .gte("scheduled_at", start.toISOString()).lte("scheduled_at", end.toISOString()).order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: payments = [], isLoading: loadingPayments, isError: errorPayments } = useQuery({
    queryKey: ["payments", companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("company_id", companyId)
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: true });
      if (error) throw error;
      return data as Tables<"payments">[];
    },
  });
  // "Hoje" (cabeçalho + Agenda de hoje) é sempre ancorado em hoje de
  // verdade, independente do período escolhido acima pro "Desempenho
  // financeiro" — mesmo raciocínio que já existia pra "Fila de hoje" antes
  // desta reformulação. Agora com os nomes já vindo via join (evita os
  // `.find()` manuais que existiam antes).
  const { data: appointmentsHoje = [], isLoading: loadingAppointmentsHoje, isError: errorAppointmentsHoje } = useQuery({
    queryKey: ["appointments-hoje", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name), services(name), professionals(name)")
        .eq("company_id", companyId)
        .gte("scheduled_at", startOfDay(hoje).toISOString())
        .lte("scheduled_at", endOfDay(hoje).toISOString())
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data as unknown as (Tables<"appointments"> & { clients: { name: string } | null; services: { name: string } | null; professionals: { name: string } | null })[];
    },
  });
  const { data: paymentsHoje = [], isLoading: loadingPaymentsHoje } = useQuery({
    queryKey: ["payments-hoje", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount,status").eq("company_id", companyId).eq("status", "paid")
        .gte("created_at", startOfDay(hoje).toISOString()).lte("created_at", endOfDay(hoje).toISOString());
      if (error) throw error;
      return data as { amount: number; status: string }[];
    },
  });
  const { data: paymentsPrevPeriodo = [] } = useQuery({
    queryKey: ["payments-prev", companyId, prevStart.toISOString(), prevEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("amount").eq("company_id", companyId).eq("status", "paid")
        .gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString());
      if (error) throw error;
      return data as { amount: number }[];
    },
  });
  const { data: professionals = [], isLoading: loadingProfessionals, isError: errorProfessionals } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });
  const { data: clients = [], isLoading: loadingClients, isError: errorClients } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId).eq("active", true);
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });
  const { data: services = [], isLoading: loadingServices, isError: errorServices } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  // Clientes com pelo menos 1 agendamento futuro ainda agendado — pra
  // "sem próximo agendamento" na seção Clientes. Escopo próprio (não é o
  // período do dashboard): é sempre "daqui pra frente", igual à "Agenda de
  // hoje". Traz só a coluna necessária (client_id), nunca a linha inteira.
  const { data: futureClientIds = [] } = useQuery({
    queryKey: ["clients-com-proximo", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("client_id").eq("company_id", companyId)
        .eq("status", "scheduled").gt("scheduled_at", new Date().toISOString());
      if (error) throw error;
      return data as { client_id: string }[];
    },
  });
  // Alertas — só os que têm um sinal barato e real de calcular (ver
  // AlertsPanel). Produtos e pagamentos pendentes trazem só as colunas
  // necessárias; não são consultas "pesadas" (estoque de um salão não tem
  // milhares de itens, e pendências ficam com poucas linhas na prática).
  const { data: products = [] } = useQuery({
    queryKey: ["products-estoque-baixo", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,stock_qty,min_stock_qty").eq("company_id", companyId);
      if (error) throw error;
      return data as { id: string; name: string; stock_qty: number; min_stock_qty: number }[];
    },
  });
  const { data: pendingPaymentsCount = 0 } = useQuery({
    queryKey: ["payments-pendentes-count", companyId],
    queryFn: async () => {
      const { count, error } = await supabase.from("payments").select("*", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
  const { data: recentClients = [] } = useQuery({
    queryKey: ["clients-recentes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId).eq("active", true).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });
  // Atividade recente — combinação de fontes reais já existentes (não há
  // uma tabela de auditoria que cubra tudo isso). Cada fonte já vem com
  // `limit(5)`, então o total nunca passa de ~15 linhas buscadas.
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ["appointments-recentes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("id, created_at, status, updated_at, clients(name), services(name)")
        .eq("company_id", companyId).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as unknown as { id: string; created_at: string; status: string; updated_at: string; clients: { name: string } | null; services: { name: string } | null }[];
    },
  });
  const { data: recentCompleted = [] } = useQuery({
    queryKey: ["appointments-concluidos-recentes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("id, updated_at, price, clients(name), services(name)")
        .eq("company_id", companyId).eq("status", "completed").order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as unknown as { id: string; updated_at: string; price: number; clients: { name: string } | null; services: { name: string } | null }[];
    },
  });
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["payments-recentes", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("id, created_at, amount, clients(name)")
        .eq("company_id", companyId).eq("status", "paid").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as unknown as { id: string; created_at: string; amount: number; clients: { name: string } | null }[];
    },
  });

  const isLoading = loadingAppointments || loadingPayments || loadingAppointmentsHoje || loadingPaymentsHoje || loadingProfessionals || loadingClients || loadingServices;
  const isError = errorAppointments || errorPayments || errorAppointmentsHoje || errorProfessionals || errorClients || errorServices;

  const appointmentsPeriodo = useMemo(
    () => appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      if (d < start || d > end) return false;
      if (filters.professionalIds.length > 0 && !filters.professionalIds.includes(a.professional_id)) return false;
      if (filters.serviceIds.length > 0 && !filters.serviceIds.includes(a.service_id)) return false;
      if (filters.status.length > 0 && !filters.status.includes(a.status)) return false;
      if (filters.clientId && a.client_id !== filters.clientId) return false;
      return true;
    }),
    [appointments, start, end, filters]
  );

  const paymentsPeriodo = useMemo(
    () => payments.filter((p) => {
      const d = new Date(p.created_at);
      if (d < start || d > end || p.status !== "paid") return false;
      if (filters.clientId && p.client_id !== filters.clientId) return false;
      if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(p.method || "")) return false;
      if (filters.professionalIds.length > 0 || filters.serviceIds.length > 0 || filters.status.length > 0) {
        const agendamento = appointments.find((a) => a.id === p.appointment_id);
        if (!agendamento) return false;
        if (filters.professionalIds.length > 0 && !filters.professionalIds.includes(agendamento.professional_id)) return false;
        if (filters.serviceIds.length > 0 && !filters.serviceIds.includes(agendamento.service_id)) return false;
        if (filters.status.length > 0 && !filters.status.includes(agendamento.status)) return false;
      }
      return true;
    }),
    [payments, appointments, start, end, filters]
  );

  const faturamento = paymentsPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const faturamentoAnterior = paymentsPrevPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const variacaoPct = faturamentoAnterior > 0 ? ((faturamento - faturamentoAnterior) / faturamentoAnterior) * 100 : null;
  const concluidosPeriodo = appointmentsPeriodo.filter((a) => a.status === "completed").length;
  const ticketMedio = concluidosPeriodo > 0 ? faturamento / concluidosPeriodo : null;

  const profissionaisConsiderados = filters.professionalIds.length > 0 ? professionals.filter((p) => filters.professionalIds.includes(p.id)) : professionals;
  const horasExpediente = filters.periodo === "personalizado" ? Math.max(1, differenceInCalendarDays(end, start) + 1) * 8 : HORAS_EXPEDIENTE_POR_PERIODO[filters.periodo];
  const ocupacao = profissionaisConsiderados.length ? Math.round((appointmentsPeriodo.length / (profissionaisConsiderados.length * horasExpediente)) * 100) : 0;

  const serieFaturamento = useMemo(() => {
    const grupos: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const d = new Date(p.created_at);
      const chave = filters.periodo.startsWith("ano") ? d.toLocaleDateString("pt-BR", { month: "short" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      grupos[chave] = (grupos[chave] || 0) + Number(p.amount || 0);
    });
    return Object.entries(grupos).map(([data, valor]) => ({ data, valor }));
  }, [paymentsPeriodo, filters.periodo]);

  const faturamentoPorProfissional = useMemo(() => {
    return profissionaisConsiderados
      .map((prof) => {
        const total = paymentsPeriodo.filter((pg) => appointmentsPeriodo.find((a) => a.id === pg.appointment_id && a.professional_id === prof.id)).reduce((s, pg) => s + Number(pg.amount || 0), 0);
        const atendimentos = appointmentsPeriodo.filter((a) => a.professional_id === prof.id).length;
        return { nome: prof.name.split(" ")[0], faturamento: total, atendimentos };
      })
      .filter((x) => x.atendimentos > 0);
  }, [profissionaisConsiderados, paymentsPeriodo, appointmentsPeriodo]);

  const rankingAtendimentos = useMemo(
    () => [...faturamentoPorProfissional].sort((a, b) => b.atendimentos - a.atendimentos),
    [faturamentoPorProfissional]
  );

  const servicoStats = useMemo(() => {
    const contagem: Record<string, number> = {};
    const receita: Record<string, number> = {};
    appointmentsPeriodo.forEach((a) => { contagem[a.service_id] = (contagem[a.service_id] || 0) + 1; });
    paymentsPeriodo.forEach((p) => {
      const ag = appointments.find((a) => a.id === p.appointment_id);
      if (ag) receita[ag.service_id] = (receita[ag.service_id] || 0) + Number(p.amount || 0);
    });
    const nome = (id: string) => services.find((s) => s.id === id)?.name ?? "Serviço removido";
    const maisAgendadoId = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    const maiorFaturamentoId = Object.entries(receita).sort((a, b) => b[1] - a[1])[0];
    return {
      maisAgendado: maisAgendadoId ? { nome: nome(maisAgendadoId[0]), atendimentos: maisAgendadoId[1] } : null,
      maiorFaturamento: maiorFaturamentoId ? { nome: nome(maiorFaturamentoId[0]), valor: maiorFaturamentoId[1] } : null,
    };
  }, [appointmentsPeriodo, paymentsPeriodo, appointments, services]);

  const porMetodoPagamento = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => { totais[p.method || "outro"] = (totais[p.method || "outro"] || 0) + Number(p.amount || 0); });
    return Object.entries(totais).map(([name, value]) => ({ name, value, fill: CORES_METODO[name] || "hsl(var(--chart-3))" }));
  }, [paymentsPeriodo]);

  // --- "Hoje" (sempre ancorado em hoje, não no período do filtro) ---------
  const agendamentosHojeValidos = appointmentsHoje.filter((a) => a.status !== "canceled");
  const receitaHoje = paymentsHoje.reduce((s, p) => s + Number(p.amount || 0), 0);
  const clientesHoje = new Set(agendamentosHojeValidos.map((a) => a.client_id)).size;
  const cancelamentosHoje = appointmentsHoje.filter((a) => a.status === "canceled" || a.status === "no_show").length;
  const atendimentosConcluidosHoje = appointmentsHoje.filter((a) => a.status === "completed").length;

  // --- Clientes ------------------------------------------------------------
  const clientesNovos = clients.filter((c) => { const d = new Date(c.created_at); return d >= start && d <= end; }).length;
  const clientesRecorrentes = useMemo(() => {
    const porCliente: Record<string, number> = {};
    appointmentsPeriodo.filter((a) => a.status === "completed").forEach((a) => { porCliente[a.client_id] = (porCliente[a.client_id] || 0) + 1; });
    return Object.values(porCliente).filter((n) => n > 1).length;
  }, [appointmentsPeriodo]);
  const clientesSemProximo = Math.max(0, clients.length - new Set(futureClientIds.map((r) => r.client_id)).size);

  // --- Alertas ---------------------------------------------------------------
  const alertas = useMemo(() => {
    const lista: Alerta[] = [];
    const estoqueBaixo = products.filter((p) => p.min_stock_qty > 0 && p.stock_qty <= p.min_stock_qty);
    if (estoqueBaixo.length > 0) {
      lista.push({ id: "estoque", label: "Estoque baixo", description: `${estoqueBaixo.length} produto${estoqueBaixo.length === 1 ? "" : "s"} no ou abaixo do estoque mínimo.`, href: "/estoque" });
    }
    if (pendingPaymentsCount > 0) {
      lista.push({ id: "pagamentos", label: "Pagamentos pendentes", description: `${pendingPaymentsCount} pagamento${pendingPaymentsCount === 1 ? "" : "s"} aguardando confirmação.`, href: "/financeiro" });
    }
    const servicoSemPreco = services.filter((s) => Number(s.price) === 0);
    if (servicoSemPreco.length > 0) {
      lista.push({ id: "servico-preco", label: "Serviço sem preço definido", description: `${servicoSemPreco.length} serviço${servicoSemPreco.length === 1 ? "" : "s"} ativo${servicoSemPreco.length === 1 ? "" : "s"} com preço R$ 0,00.`, href: "/servicos" });
    }
    if (subscription && (subscription.status === "trial" || subscription.status === "past_due")) {
      const dataLimite = subscription.trial_ends_at ?? subscription.current_period_end;
      if (dataLimite) {
        const dias = differenceInCalendarDays(new Date(dataLimite), new Date());
        if (dias <= ALERTA_ASSINATURA_DIAS) {
          lista.push({
            id: "assinatura",
            label: subscription.status === "trial" ? "Trial acabando" : "Pagamento da assinatura pendente",
            description: dias >= 0 ? `Vence em ${dias} dia${dias === 1 ? "" : "s"}.` : "Já venceu — escolha um plano para continuar.",
            href: "/meu-plano",
          });
        }
      }
    }
    return lista;
  }, [products, pendingPaymentsCount, services, subscription]);

  // --- Atividade recente -----------------------------------------------------
  const atividade = useMemo(() => {
    const itens: AtividadeItem[] = [];
    recentClients.slice(0, 5).forEach((c) => itens.push({ id: `cliente-${c.id}`, tipo: "cliente", texto: `Novo cliente cadastrado: ${c.name}`, timestamp: c.created_at }));
    recentAppointments.forEach((a) => itens.push({ id: `agendamento-${a.id}`, tipo: "agendamento", texto: `Novo agendamento: ${a.clients?.name ?? "Cliente"} · ${a.services?.name ?? "Serviço"}`, timestamp: a.created_at }));
    recentCompleted.forEach((a) => itens.push({ id: `concluido-${a.id}`, tipo: "concluido", texto: `Atendimento concluído: ${a.clients?.name ?? "Cliente"} · ${a.services?.name ?? "Serviço"}`, timestamp: a.updated_at }));
    recentPayments.forEach((p) => itens.push({ id: `pagamento-${p.id}`, tipo: "pagamento", texto: `Pagamento registrado: ${p.clients?.name ?? "Cliente"} · ${formatCurrency(p.amount)}`, timestamp: p.created_at }));
    return itens.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 8);
  }, [recentClients, recentAppointments, recentCompleted, recentPayments]);

  async function mudarStatus(appointment: Tables<"appointments">, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar o agendamento"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["appointments", companyId] });
    qc.invalidateQueries({ queryKey: ["appointments-hoje", companyId] });
    toast({ title: "Status atualizado" });
  }

  const showProfessionalFilter = professionals.filter((p) => p.active).length > 1;
  const primeiroNome = fullName?.trim().split(/\s+/)[0];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">{primeiroNome ? `Olá, ${primeiroNome}!` : "Olá!"}</h1>
          <p className="text-sm text-muted-foreground">Veja como está o seu negócio hoje.</p>
        </div>
        <FiltersBar
          periodo={filters.periodo}
          onPeriodoChange={(p) => setFilters((f) => ({ ...f, periodo: p }))}
          activeFilterCount={countActiveFilters(filters)}
          onOpenAdvanced={() => setFiltrosAbertos(true)}
        />
        <AdvancedFiltersDialog
          open={filtrosAbertos}
          onOpenChange={setFiltrosAbertos}
          appliedFilters={filters}
          onApply={setFilters}
          professionals={professionals}
          services={services}
          clients={clients}
          showProfessionalFilter={showProfessionalFilter}
        />
      </div>

      <SetupGuide {...setup} />

      {isLoading ? (
        <LoadingState text="Carregando dashboard..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar os dados do dashboard." />
      ) : (
        <>
          <TodayOverview
            agendamentos={agendamentosHojeValidos.length}
            atendimentos={atendimentosConcluidosHoje}
            clientes={clientesHoje}
            receita={receitaHoje}
            cancelamentos={cancelamentosHoje}
          />

          <QuickActions />

          <div className="grid lg:grid-cols-2 gap-4">
            <AgendaTodayCard agendamentos={appointmentsHoje} onMudarStatus={mudarStatus} />

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Desempenho financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MiniKpi icon={DollarSign} label="Receita no período" value={formatCurrency(faturamento)} />
                  <MiniKpi icon={CalendarDays} label="Atendimentos" value={String(appointmentsPeriodo.length)} />
                  <MiniKpi icon={Users} label="Ticket médio" value={ticketMedio != null ? formatCurrency(ticketMedio) : "—"} />
                  <div>
                    <p className="text-xs text-muted-foreground">Vs. período anterior</p>
                    {variacaoPct == null ? (
                      <p className="text-lg font-semibold mt-0.5 text-muted-foreground">—</p>
                    ) : (
                      <p className={cn("text-lg font-semibold mt-0.5 flex items-center gap-1", variacaoPct > 0 ? "text-chart-2" : variacaoPct < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {variacaoPct > 0 ? <TrendingUp className="w-4 h-4" /> : variacaoPct < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        {variacaoPct > 0 ? "+" : ""}{variacaoPct.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
                {serieFaturamento.length === 0 ? (
                  <Empty />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={serieFaturamento}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <ClientsSummaryCard total={clients.length} novos={clientesNovos} recorrentes={clientesRecorrentes} semProximo={clientesSemProximo} />
            {professionals.length > 1 ? (
              <TeamSummaryCard ativos={professionals.filter((p) => p.active).length} atendimentosHoje={atendimentosConcluidosHoje} ranking={rankingAtendimentos} />
            ) : (
              <ServicesSummaryCard totalAtivos={services.length} maisAgendado={servicoStats.maisAgendado} maiorFaturamento={servicoStats.maiorFaturamento} />
            )}
          </div>

          {/* Formas de pagamento não depende de ter equipe — precisa
              aparecer também pro profissional autônomo sozinho (caso mais
              comum). Só a posição muda: com equipe, forma um par com
              Serviços (que já apareceu sozinho na linha de cima); sem
              equipe, Serviços já apareceu ali em cima, então este cartão
              fica sozinho (largura cheia). */}
          <div className="grid lg:grid-cols-2 gap-4">
            {professionals.length > 1 && (
              <ServicesSummaryCard totalAtivos={services.length} maisAgendado={servicoStats.maisAgendado} maiorFaturamento={servicoStats.maiorFaturamento} />
            )}
            <Card className={professionals.length > 1 ? undefined : "lg:col-span-2"}>
              <CardHeader><CardTitle className="text-base">Formas de pagamento</CardTitle></CardHeader>
              <CardContent>
                {porMetodoPagamento.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={porMetodoPagamento} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {porMetodoPagamento.map((m) => <Cell key={m.name} fill={m.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertsPanel alertas={alertas} />

          <div className="grid lg:grid-cols-2 gap-4">
            <RecentClientsCard clientes={recentClients} />
            <RecentActivityCard itens={atividade} />
          </div>

          {faturamentoPorProfissional.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Faturamento por profissional</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={faturamentoPorProfissional}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground pt-1">
            Ocupação no período: <span className="font-medium text-foreground">{ocupacao}%</span>
            {" · "}
            <Link href="/agenda" className="text-primary hover:underline inline-flex items-center gap-0.5">Ver agenda completa <ArrowRight className="w-3 h-3" /></Link>
          </p>
        </>
      )}
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</p>
      <p className="text-lg font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function Empty({ text = "Sem dados no período" }: { text?: string }) {
  return <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
