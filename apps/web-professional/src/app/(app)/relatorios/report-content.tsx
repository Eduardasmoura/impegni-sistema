"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { STATUS_LABEL, METODO_PAGAMENTO_LABEL, PAGAMENTO_STATUS_LABEL } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";
import { differenceInCalendarDays, eachDayOfInterval, format as formatDf, startOfMonth } from "date-fns";
import type { RelatoriosRawData } from "./report-data";
import { filterAppointments } from "./report-data";
import type { RelatoriosFilters } from "./filters";
import type { ExportColumn, ExportRow } from "./export";

export type Kpi = { label: string; value: string; hint?: string };
export type ReportContent = {
  kpis: Kpi[];
  chart: React.ReactNode | null;
  columns: ExportColumn[];
  rows: ExportRow[];
  emptyMessage?: string;
};

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function porDia(datas: { date: Date; value: number }[]): { data: string; valor: number }[] {
  const map = new Map<string, number>();
  datas.forEach(({ date, value }) => {
    const k = formatDf(date, "dd/MM");
    map.set(k, (map.get(k) ?? 0) + value);
  });
  return Array.from(map.entries()).map(([data, valor]) => ({ data, valor }));
}

// O tooltip do recharts fica sempre montado no DOM (só oculto via
// visibility, não display:none) e por padrão não tem limite de largura —
// com um nome de cliente/profissional/serviço comprido, essa caixa
// invisível ficava mais larga que a tela inteira e "vazava" a página
// (scrollbar horizontal fantasma). `truncateLabel` + `wrapperStyle` com
// teto de largura resolvem isso em todo gráfico da Central.
function truncateLabel(label: unknown, max = 28): string {
  const s = String(label ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
const TOOLTIP_WRAPPER_STYLE = { maxWidth: 260 };

function BarraSimples({ data, dataKeyX = "data", dataKeyY = "valor", formatter }: { data: { [k: string]: string | number }[]; dataKeyX?: string; dataKeyY?: string; formatter?: (v: number) => string }) {
  if (data.length === 0) return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={dataKeyX} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => truncateLabel(v, 14)} />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          formatter={formatter ? (v: number) => formatter(v) : undefined}
          labelFormatter={(l) => truncateLabel(l)}
          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
          contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }}
        />
        <Bar dataKey={dataKeyY} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PizzaSimples({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={(e) => truncateLabel(e.name, 16)}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => truncateLabel(l)} wrapperStyle={TOOLTIP_WRAPPER_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => truncateLabel(v, 20)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Motor de conteúdo dos relatórios PRONTOS — um switch por
 * categoria.relatório, cada um calculando em cima do MESMO dado bruto já
 * buscado (`report-data.ts`), nunca refazendo query. RPCs específicas
 * (comissão, ocupação, segmentação de clientes) são chamadas aqui via
 * `useQuery` próprio — são as MESMAS já usadas em Financeiro/Agenda/
 * Segmentação, não uma segunda implementação da regra.
 */
export function useReportContent(
  categoryKey: string,
  slug: string,
  raw: RelatoriosRawData,
  filters: RelatoriosFilters,
  professionals: Tables<"professionals">[],
  services: Tables<"services">[]
): { content: ReportContent | null; isLoading: boolean } {
  const supabase = createClient();
  const diasNoPeriodo = Math.max(1, differenceInCalendarDays(raw.periodo.end, raw.periodo.start) + 1);
  const key = `${categoryKey}.${slug}`;

  const appointmentsFiltrados = useMemo(() => filterAppointments(raw.appointments, filters), [raw.appointments, filters]);
  const apptIdsFiltrados = useMemo(() => new Set(appointmentsFiltrados.map((a) => a.id)), [appointmentsFiltrados]);
  const paymentsFiltrados = useMemo(() => {
    const algumFiltroDeAgenda = filters.professionalIds.length > 0 || filters.serviceIds.length > 0 || filters.status.length > 0;
    return raw.payments
      .filter((p) => !algumFiltroDeAgenda || !p.appointment_id || apptIdsFiltrados.has(p.appointment_id))
      .filter((p) => !filters.paymentMethods.length || (p.method && filters.paymentMethods.includes(p.method)));
  }, [raw.payments, apptIdsFiltrados, filters]);

  // ---- RPCs sob demanda (só chamadas quando o relatório aberto precisa) ----
  const precisaComissao = key === "financeiro.comissoes" || key === "equipe.desempenho" || key === "visao-geral.kpis";
  const comissaoQ = useQuery({
    queryKey: ["rel-comissao", raw.periodo.start.toISOString(), raw.periodo.end.toISOString(), professionals.map((p) => p.id).join(","), filters.professionalIds.join(",")],
    enabled: precisaComissao && professionals.length > 0,
    queryFn: async () => {
      const alvo = filters.professionalIds.length ? professionals.filter((p) => filters.professionalIds.includes(p.id)) : professionals;
      const resultados = await Promise.all(
        alvo.map(async (p) => {
          const { data, error } = await supabase.rpc("calculate_professional_payout", {
            p_company_id: p.company_id, p_professional_id: p.id,
            p_period_start: raw.periodo.start.toISOString(), p_period_end: raw.periodo.end.toISOString(),
          });
          if (error) return { professional: p, total_commission: 0, total_revenue: 0, total_appointments: 0 };
          const row = Array.isArray(data) ? data[0] : data;
          return { professional: p, total_commission: Number(row?.total_commission ?? 0), total_revenue: Number(row?.total_revenue ?? 0), total_appointments: Number(row?.total_appointments ?? 0) };
        })
      );
      return resultados;
    },
  });

  const precisaOcupacao = key === "agendamentos.ocupacao" || key === "equipe.desempenho" || key === "visao-geral.kpis";
  const ocupacaoQ = useQuery({
    queryKey: ["rel-ocupacao", raw.periodo.start.toISOString(), raw.periodo.end.toISOString(), professionals.map((p) => p.id).join(","), filters.professionalIds.join(",")],
    enabled: precisaOcupacao && professionals.length > 0,
    queryFn: async () => {
      const alvo = filters.professionalIds.length ? professionals.filter((p) => filters.professionalIds.includes(p.id)) : professionals;
      const meses = Array.from(new Set(eachDayOfInterval({ start: raw.periodo.start, end: raw.periodo.end }).map((d) => formatDf(startOfMonth(d), "yyyy-MM-dd"))));
      const resultados = await Promise.all(
        alvo.flatMap((p) =>
          meses.map(async (mes) => {
            const { data, error } = await supabase.rpc("get_professional_occupancy_month", { p_company_id: p.company_id, p_professional_id: p.id, p_month: mes });
            if (error || !data) return { professional: p, dias: [] as { day: string; occupied_min: number; capacity_min: number }[] };
            return { professional: p, dias: (data as { day: string; occupied_min: number; capacity_min: number }[]).filter((d) => new Date(d.day) >= raw.periodo.start && new Date(d.day) <= raw.periodo.end) };
          })
        )
      );
      // agrupa por profissional somando os meses
      const porProfissional = new Map<string, { professional: Tables<"professionals">; occupied: number; capacity: number }>();
      resultados.forEach(({ professional, dias }) => {
        const acc = porProfissional.get(professional.id) ?? { professional, occupied: 0, capacity: 0 };
        dias.forEach((d) => { acc.occupied += d.occupied_min; acc.capacity += d.capacity_min; });
        porProfissional.set(professional.id, acc);
      });
      return Array.from(porProfissional.values());
    },
  });

  const precisaSegmento = categoryKey === "clientes";
  const segmentoQ = useQuery({
    queryKey: ["rel-segmento", key, raw.periodo.start.toISOString(), raw.periodo.end.toISOString()],
    enabled: precisaSegmento,
    queryFn: async () => {
      const companyId = professionals[0]?.company_id ?? raw.payments[0]?.company_id ?? raw.expenses[0]?.company_id ?? null;
      if (!companyId) return [];
      if (slug === "recorrencia") {
        const { data } = await supabase.rpc("get_recurring_client_candidates", { p_company_id: companyId, p_period_days: diasNoPeriodo, p_min_appointments: 2 });
        return data ?? [];
      }
      if (slug === "inatividade") {
        const { data } = await supabase.rpc("get_inactive_client_candidates", { p_company_id: companyId, p_days_inactive: diasNoPeriodo });
        return data ?? [];
      }
      if (slug === "aniversariantes") {
        const { data } = await supabase.rpc("get_birthday_candidates_range", { p_company_id: companyId, p_start_date: formatDf(raw.periodo.start, "yyyy-MM-dd"), p_days: diasNoPeriodo });
        return data ?? [];
      }
      return [];
    },
  });


  const content: ReportContent | null = useMemo(() => {
    switch (key) {
      // ---------------------------------------------------------------- FINANCEIRO
      case "financeiro.receita": {
        const bruta = paymentsFiltrados.reduce((s, p) => s + Number(p.amount), 0);
        const recebida = paymentsFiltrados.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
        const serie = porDia(paymentsFiltrados.filter((p) => p.status === "paid").map((p) => ({ date: new Date(p.created_at), value: Number(p.amount) })));
        return {
          kpis: [
            { label: "Receita bruta", value: formatCurrency(bruta), hint: "Todos os lançamentos" },
            { label: "Receita recebida", value: formatCurrency(recebida), hint: "Só pagamentos confirmados" },
            { label: "Lançamentos", value: String(paymentsFiltrados.length) },
          ],
          chart: <BarraSimples data={serie} formatter={formatCurrency} />,
          columns: [
            { key: "data", label: "Data" }, { key: "cliente", label: "Cliente" }, { key: "forma", label: "Forma" },
            { key: "valor", label: "Valor", align: "right" }, { key: "status", label: "Status" },
          ],
          rows: paymentsFiltrados.map((p) => ({ data: formatDateTime(p.created_at), cliente: p.clients?.name ?? "—", forma: p.method ? METODO_PAGAMENTO_LABEL[p.method] ?? p.method : "—", valor: formatCurrency(Number(p.amount)), status: PAGAMENTO_STATUS_LABEL[p.status] ?? p.status })),
        };
      }
      case "financeiro.despesas": {
        const total = raw.expenses.reduce((s, e) => s + Number(e.amount), 0);
        const porCategoria = new Map<string, number>();
        raw.expenses.forEach((e) => porCategoria.set(e.category ?? "Sem categoria", (porCategoria.get(e.category ?? "Sem categoria") ?? 0) + Number(e.amount)));
        return {
          kpis: [
            { label: "Total de despesas", value: formatCurrency(total) },
            { label: "Lançamentos", value: String(raw.expenses.length) },
            { label: "Média por lançamento", value: formatCurrency(raw.expenses.length ? total / raw.expenses.length : 0) },
          ],
          chart: <PizzaSimples data={Array.from(porCategoria.entries()).map(([name, value]) => ({ name, value }))} />,
          columns: [{ key: "data", label: "Data" }, { key: "categoria", label: "Categoria" }, { key: "descricao", label: "Descrição" }, { key: "valor", label: "Valor", align: "right" }],
          rows: raw.expenses.map((e) => ({ data: formatDate(e.expense_date), categoria: e.category ?? "Sem categoria", descricao: e.description, valor: formatCurrency(Number(e.amount)) })),
        };
      }
      case "financeiro.comissoes": {
        const dados = comissaoQ.data ?? [];
        const total = dados.reduce((s, d) => s + d.total_commission, 0);
        return {
          kpis: [
            { label: "Comissão total no período", value: formatCurrency(total) },
            { label: "Profissionais com repasse", value: String(dados.filter((d) => d.total_commission > 0).length) },
          ],
          chart: <BarraSimples data={dados.map((d) => ({ data: d.professional.name, valor: d.total_commission }))} dataKeyX="data" formatter={formatCurrency} />,
          columns: [{ key: "profissional", label: "Profissional" }, { key: "atendimentos", label: "Atendimentos", align: "right" }, { key: "receita", label: "Receita gerada", align: "right" }, { key: "comissao", label: "Comissão", align: "right" }],
          rows: dados.map((d) => ({ profissional: d.professional.name, atendimentos: d.total_appointments, receita: formatCurrency(d.total_revenue), comissao: formatCurrency(d.total_commission) })),
        };
      }

      // ---------------------------------------------------------------- AGENDAMENTOS
      case "agendamentos.agendamentos": {
        const serie = porDia(appointmentsFiltrados.map((a) => ({ date: new Date(a.scheduled_at), value: 1 })));
        return {
          kpis: [
            { label: "Total no período", value: String(appointmentsFiltrados.length) },
            { label: "Realizados", value: String(appointmentsFiltrados.filter((a) => a.status === "completed").length) },
            { label: "Profissionais envolvidos", value: String(new Set(appointmentsFiltrados.map((a) => a.professional_id)).size) },
          ],
          chart: <BarraSimples data={serie} />,
          columns: [{ key: "data", label: "Data" }, { key: "cliente", label: "Cliente" }, { key: "servico", label: "Serviço" }, { key: "profissional", label: "Profissional" }, { key: "status", label: "Status" }],
          rows: appointmentsFiltrados.map((a) => ({ data: formatDateTime(a.scheduled_at), cliente: a.clients?.name ?? "—", servico: a.services?.name ?? "—", profissional: a.professionals?.name ?? "—", status: STATUS_LABEL[a.status] ?? a.status })),
        };
      }
      case "agendamentos.cancelamentos": {
        const cancelados = appointmentsFiltrados.filter((a) => a.status === "canceled");
        const noShow = appointmentsFiltrados.filter((a) => a.status === "no_show");
        const taxa = appointmentsFiltrados.length ? ((cancelados.length + noShow.length) / appointmentsFiltrados.length) * 100 : 0;
        const combinados = [...cancelados, ...noShow];
        return {
          kpis: [
            { label: "Cancelados", value: String(cancelados.length) },
            { label: "Não compareceu", value: String(noShow.length) },
            { label: "Taxa sobre o total", value: `${taxa.toFixed(1)}%` },
          ],
          chart: <BarraSimples data={porDia(combinados.map((a) => ({ date: new Date(a.scheduled_at), value: 1 })))} />,
          columns: [{ key: "data", label: "Data" }, { key: "cliente", label: "Cliente" }, { key: "profissional", label: "Profissional" }, { key: "status", label: "Status" }],
          rows: combinados.map((a) => ({ data: formatDateTime(a.scheduled_at), cliente: a.clients?.name ?? "—", profissional: a.professionals?.name ?? "—", status: STATUS_LABEL[a.status] ?? a.status })),
          emptyMessage: combinados.length === 0 ? "Nenhum cancelamento ou não comparecimento no período — ótimo sinal." : undefined,
        };
      }
      case "agendamentos.ocupacao": {
        const dados = ocupacaoQ.data ?? [];
        const totalOcc = dados.reduce((s, d) => s + d.occupied, 0);
        const totalCap = dados.reduce((s, d) => s + d.capacity, 0);
        const pct = totalCap ? (totalOcc / totalCap) * 100 : 0;
        return {
          kpis: [{ label: "Ocupação média", value: `${pct.toFixed(1)}%` }, { label: "Profissionais", value: String(dados.length) }],
          chart: <BarraSimples data={dados.map((d) => ({ data: d.professional.name, valor: d.capacity ? Number(((d.occupied / d.capacity) * 100).toFixed(1)) : 0 }))} formatter={(v) => `${v}%`} />,
          columns: [{ key: "profissional", label: "Profissional" }, { key: "ocupacao", label: "Ocupação", align: "right" }],
          rows: dados.map((d) => ({ profissional: d.professional.name, ocupacao: `${d.capacity ? ((d.occupied / d.capacity) * 100).toFixed(1) : "0"}%` })),
        };
      }

      // ---------------------------------------------------------------- CLIENTES
      case "clientes.aquisicao": {
        const serie = porDia(raw.clients.map((c) => ({ date: new Date(c.created_at), value: 1 })));
        return {
          kpis: [{ label: "Novos clientes no período", value: String(raw.clients.length) }],
          chart: <BarraSimples data={serie} />,
          columns: [{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone" }, { key: "data", label: "Cadastrado em" }],
          rows: raw.clients.map((c) => ({ nome: c.name, telefone: c.phone ?? "—", data: formatDate(c.created_at) })),
        };
      }
      case "clientes.recorrencia":
      case "clientes.inatividade":
      case "clientes.aniversariantes": {
        type LinhaSegmento = { client_id: string; name: string; phone: string; [k: string]: unknown };
        const dados = (segmentoQ.data ?? []) as LinhaSegmento[];
        const extraCol = slug === "recorrencia" ? { key: "appointments_count", label: "Atendimentos" } : slug === "inatividade" ? { key: "last_appointment_at", label: "Último atendimento" } : { key: "next_birthday", label: "Próximo aniversário" };
        return {
          kpis: [{ label: slug === "recorrencia" ? "Clientes recorrentes" : slug === "inatividade" ? "Clientes inativos" : "Aniversariantes no período", value: String(dados.length) }],
          chart: null,
          columns: [{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone" }, { key: extraCol.key, label: extraCol.label }],
          rows: dados.map((d) => ({
            nome: d.name, telefone: d.phone ?? "—",
            [extraCol.key]: extraCol.key.includes("_at") || extraCol.key === "next_birthday" ? formatDate(String(d[extraCol.key])) : String(d[extraCol.key] ?? "—"),
          })),
        };
      }

      // ---------------------------------------------------------------- SERVIÇOS
      case "servicos.desempenho": {
        const porServico = new Map<string, { qtd: number; receita: number }>();
        appointmentsFiltrados.filter((a) => a.status === "completed").forEach((a) => {
          const acc = porServico.get(a.service_id) ?? { qtd: 0, receita: 0 };
          acc.qtd += 1; acc.receita += Number(a.price);
          porServico.set(a.service_id, acc);
        });
        const linhas = Array.from(porServico.entries()).map(([id, v]) => ({ id, nome: services.find((s) => s.id === id)?.name ?? "—", ...v, ticket: v.qtd ? v.receita / v.qtd : 0 })).sort((a, b) => b.receita - a.receita);
        return {
          kpis: [{ label: "Serviços com atendimento", value: String(linhas.length) }, { label: "Receita total", value: formatCurrency(linhas.reduce((s, l) => s + l.receita, 0)) }],
          chart: <BarraSimples data={linhas.slice(0, 8).map((l) => ({ data: l.nome, valor: l.receita }))} formatter={formatCurrency} />,
          columns: [{ key: "servico", label: "Serviço" }, { key: "qtd", label: "Atendimentos", align: "right" }, { key: "receita", label: "Receita", align: "right" }, { key: "ticket", label: "Ticket médio", align: "right" }],
          rows: linhas.map((l) => ({ servico: l.nome, qtd: l.qtd, receita: formatCurrency(l.receita), ticket: formatCurrency(l.ticket) })),
        };
      }

      // ---------------------------------------------------------------- EQUIPE
      case "equipe.desempenho": {
        const comissao = comissaoQ.data ?? [];
        const ocupacao = ocupacaoQ.data ?? [];
        const alvo = filters.professionalIds.length ? professionals.filter((p) => filters.professionalIds.includes(p.id)) : professionals;
        const linhas = alvo.map((p) => {
          const atendimentos = appointmentsFiltrados.filter((a) => a.professional_id === p.id && a.status === "completed");
          const receita = atendimentos.reduce((s, a) => s + Number(a.price), 0);
          const com = comissao.find((c) => c.professional.id === p.id);
          const occ = ocupacao.find((o) => o.professional.id === p.id);
          return {
            nome: p.name, atendimentos: atendimentos.length, receita,
            ticket: atendimentos.length ? receita / atendimentos.length : 0,
            ocupacao: occ && occ.capacity ? (occ.occupied / occ.capacity) * 100 : 0,
            comissao: com?.total_commission ?? 0,
          };
        }).sort((a, b) => b.receita - a.receita);
        return {
          kpis: [{ label: "Profissionais ativos", value: String(alvo.length) }, { label: "Receita total da equipe", value: formatCurrency(linhas.reduce((s, l) => s + l.receita, 0)) }],
          chart: <BarraSimples data={linhas.map((l) => ({ data: l.nome, valor: l.receita }))} formatter={formatCurrency} />,
          columns: [{ key: "nome", label: "Profissional" }, { key: "atendimentos", label: "Atendimentos", align: "right" }, { key: "receita", label: "Receita", align: "right" }, { key: "ticket", label: "Ticket médio", align: "right" }, { key: "ocupacao", label: "Ocupação", align: "right" }, { key: "comissao", label: "Comissão", align: "right" }],
          rows: linhas.map((l) => ({ nome: l.nome, atendimentos: l.atendimentos, receita: formatCurrency(l.receita), ticket: formatCurrency(l.ticket), ocupacao: `${l.ocupacao.toFixed(1)}%`, comissao: formatCurrency(l.comissao) })),
        };
      }

      // ---------------------------------------------------------------- ESTOQUE
      case "estoque.critico": {
        const criticos = raw.products.filter((p) => p.stock_qty <= p.min_stock_qty);
        return {
          kpis: [{ label: "Itens críticos", value: String(criticos.length) }, { label: "Total de itens cadastrados", value: String(raw.products.length) }],
          chart: null,
          columns: [{ key: "produto", label: "Produto" }, { key: "estoque", label: "Estoque atual", align: "right" }, { key: "minimo", label: "Mínimo", align: "right" }],
          rows: criticos.map((p) => ({ produto: p.name, estoque: `${p.stock_qty} ${p.unit}`, minimo: `${p.min_stock_qty} ${p.unit}` })),
          emptyMessage: criticos.length === 0 ? "Nenhum item abaixo do estoque mínimo." : undefined,
        };
      }
      case "estoque.valor": {
        const valorTotal = raw.products.reduce((s, p) => s + Number(p.cost_price ?? 0) * p.stock_qty, 0);
        const porCategoria = new Map<string, number>();
        raw.products.forEach((p) => porCategoria.set(p.category ?? "Sem categoria", (porCategoria.get(p.category ?? "Sem categoria") ?? 0) + Number(p.cost_price ?? 0) * p.stock_qty));
        return {
          kpis: [{ label: "Valor total em estoque", value: formatCurrency(valorTotal) }, { label: "Itens cadastrados", value: String(raw.products.length) }],
          chart: <PizzaSimples data={Array.from(porCategoria.entries()).map(([name, value]) => ({ name, value }))} />,
          columns: [{ key: "produto", label: "Produto" }, { key: "categoria", label: "Categoria" }, { key: "estoque", label: "Estoque", align: "right" }, { key: "valor", label: "Valor", align: "right" }],
          rows: raw.products.map((p) => ({ produto: p.name, categoria: p.category ?? "Sem categoria", estoque: `${p.stock_qty} ${p.unit}`, valor: formatCurrency(Number(p.cost_price ?? 0) * p.stock_qty) })),
        };
      }

      // ---------------------------------------------------------------- MARKETING
      case "marketing.cupons": {
        const total = raw.couponRedemptions.reduce((s, c) => s + Number(c.discount_amount), 0);
        return {
          kpis: [{ label: "Cupons utilizados", value: String(raw.couponRedemptions.length) }, { label: "Desconto total concedido", value: formatCurrency(total) }],
          chart: null,
          columns: [{ key: "data", label: "Data" }, { key: "cupom", label: "Cupom" }, { key: "desconto", label: "Desconto", align: "right" }],
          rows: raw.couponRedemptions.map((c) => ({ data: formatDateTime(c.created_at), cupom: c.coupons?.code ?? "—", desconto: formatCurrency(Number(c.discount_amount)) })),
          emptyMessage: raw.couponRedemptions.length === 0 ? "Nenhum cupom utilizado no período." : undefined,
        };
      }
      case "marketing.campanhas": {
        const porStatus = new Map<string, number>();
        raw.campaignSends.forEach((c) => porStatus.set(c.status, (porStatus.get(c.status) ?? 0) + 1));
        return {
          kpis: [{ label: "Envios no período", value: String(raw.campaignSends.length) }, { label: "Com falha", value: String(raw.campaignSends.filter((c) => c.status === "failed" || c.status === "error").length) }],
          chart: <BarraSimples data={Array.from(porStatus.entries()).map(([data, valor]) => ({ data, valor }))} />,
          columns: [{ key: "data", label: "Agendado para" }, { key: "canal", label: "Canal" }, { key: "status", label: "Status" }],
          rows: raw.campaignSends.map((c) => ({ data: formatDateTime(c.scheduled_for), canal: c.channel, status: c.status })),
          emptyMessage: raw.campaignSends.length === 0 ? "Nenhuma campanha enviada no período." : undefined,
        };
      }
      case "marketing.avaliacoes": {
        const media = raw.reviews.length ? raw.reviews.reduce((s, r) => s + r.rating, 0) / raw.reviews.length : 0;
        const distrib = [1, 2, 3, 4, 5].map((n) => ({ data: `${n} ★`, valor: raw.reviews.filter((r) => r.rating === n).length }));
        return {
          kpis: [{ label: "Avaliações no período", value: String(raw.reviews.length) }, { label: "Média", value: raw.reviews.length ? media.toFixed(1) : "—" }],
          chart: <BarraSimples data={distrib} />,
          columns: [{ key: "data", label: "Data" }, { key: "profissional", label: "Profissional" }, { key: "nota", label: "Nota", align: "right" }],
          rows: raw.reviews.map((r) => ({ data: formatDate(r.created_at), profissional: r.professionals?.name ?? "—", nota: String(r.rating) })),
          emptyMessage: raw.reviews.length === 0 ? "Nenhuma avaliação recebida no período." : undefined,
        };
      }
      default:
        return null;
    }
  }, [key, slug, raw, appointmentsFiltrados, paymentsFiltrados, comissaoQ.data, ocupacaoQ.data, segmentoQ.data, professionals, services, filters]);

  return { content, isLoading: comissaoQ.isFetching || ocupacaoQ.isFetching || segmentoQ.isFetching };
}
