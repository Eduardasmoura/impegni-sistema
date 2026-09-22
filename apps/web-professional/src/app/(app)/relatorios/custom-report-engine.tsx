"use client";

import { useMemo } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { STATUS_LABEL, METODO_PAGAMENTO_LABEL, PAGAMENTO_STATUS_LABEL } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";
import type { RelatoriosRawData } from "./report-data";
import { filterAppointments } from "./report-data";
import type { RelatoriosFilters } from "./filters";
import type { ExtraFilterKey } from "./report-registry";
import type { ReportContent } from "./report-content";
import { format as formatDf } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export type CustomSourceKey = "agendamentos" | "clientes" | "servicos" | "profissionais" | "financeiro" | "estoque";

export type CustomReportConfig = {
  columns: string[];
  groupBy: string | null;
  visualization: "table" | "bar" | "line" | "kpi";
};

export type ColumnDef = { key: string; label: string };

export type SourceDef = {
  key: CustomSourceKey;
  label: string;
  description: string;
  columns: ColumnDef[];
  groupByOptions: ColumnDef[];
  measureLabel: string | null; // null = fonte não tem um número somável (ex.: lista de clientes)
  extraFilters: ExtraFilterKey[];
  usesPeriodo: boolean;
};

export const CUSTOM_SOURCES: SourceDef[] = [
  {
    key: "agendamentos", label: "Agendamentos", description: "Um agendamento por linha.",
    columns: [
      { key: "cliente", label: "Cliente" }, { key: "servico", label: "Serviço" }, { key: "profissional", label: "Profissional" },
      { key: "data", label: "Data" }, { key: "horario", label: "Horário" }, { key: "status", label: "Status" }, { key: "valor", label: "Valor" },
    ],
    groupByOptions: [{ key: "dia", label: "Dia" }, { key: "profissional", label: "Profissional" }, { key: "servico", label: "Serviço" }, { key: "status", label: "Status" }],
    measureLabel: "Valor", extraFilters: ["professional", "service", "status"], usesPeriodo: true,
  },
  {
    key: "clientes", label: "Clientes", description: "Clientes cadastrados no período.",
    columns: [{ key: "nome", label: "Nome" }, { key: "telefone", label: "Telefone" }, { key: "email", label: "E-mail" }, { key: "cadastrado_em", label: "Cadastrado em" }],
    groupByOptions: [{ key: "dia", label: "Dia de cadastro" }],
    measureLabel: null, extraFilters: [], usesPeriodo: true,
  },
  {
    key: "servicos", label: "Serviços", description: "Um serviço por linha, com totais do período.",
    columns: [{ key: "servico", label: "Serviço" }, { key: "atendimentos", label: "Atendimentos" }, { key: "receita", label: "Receita" }, { key: "ticket_medio", label: "Ticket médio" }],
    groupByOptions: [], measureLabel: "Receita", extraFilters: ["professional"], usesPeriodo: true,
  },
  {
    key: "profissionais", label: "Profissionais", description: "Um profissional por linha, com totais do período.",
    columns: [{ key: "profissional", label: "Profissional" }, { key: "atendimentos", label: "Atendimentos" }, { key: "receita", label: "Receita" }, { key: "ticket_medio", label: "Ticket médio" }],
    groupByOptions: [], measureLabel: "Receita", extraFilters: [], usesPeriodo: true,
  },
  {
    key: "financeiro", label: "Financeiro", description: "Um pagamento por linha.",
    columns: [{ key: "data", label: "Data" }, { key: "cliente", label: "Cliente" }, { key: "forma", label: "Forma de pagamento" }, { key: "valor", label: "Valor" }, { key: "status", label: "Status" }],
    groupByOptions: [{ key: "dia", label: "Dia" }, { key: "forma", label: "Forma de pagamento" }, { key: "status", label: "Status" }],
    measureLabel: "Valor", extraFilters: ["paymentMethod", "status"], usesPeriodo: true,
  },
  {
    key: "estoque", label: "Estoque", description: "Um produto por linha — foto atual, não depende do período.",
    columns: [{ key: "produto", label: "Produto" }, { key: "categoria", label: "Categoria" }, { key: "estoque", label: "Estoque" }, { key: "valor", label: "Valor" }],
    groupByOptions: [{ key: "categoria", label: "Categoria" }], measureLabel: "Valor", extraFilters: [], usesPeriodo: false,
  },
];

function baseRows(source: CustomSourceKey, raw: RelatoriosRawData, filters: RelatoriosFilters): { row: Record<string, string | number>; numeric: number; dateKey?: string }[] {
  switch (source) {
    case "agendamentos":
      return filterAppointments(raw.appointments, filters).map((a) => ({
        row: { cliente: a.clients?.name ?? "—", servico: a.services?.name ?? "—", profissional: a.professionals?.name ?? "—", data: formatDate(a.scheduled_at), horario: formatDateTime(a.scheduled_at).split(" ")[1] ?? "", status: STATUS_LABEL[a.status] ?? a.status, valor: formatCurrency(Number(a.price)) },
        numeric: Number(a.price), dateKey: formatDf(new Date(a.scheduled_at), "dd/MM"),
      }));
    case "clientes":
      return raw.clients.map((c) => ({ row: { nome: c.name, telefone: c.phone ?? "—", email: c.email ?? "—", cadastrado_em: formatDate(c.created_at) }, numeric: 1, dateKey: formatDf(new Date(c.created_at), "dd/MM") }));
    case "financeiro":
      return raw.payments.map((p) => ({
        row: { data: formatDateTime(p.created_at), cliente: p.clients?.name ?? "—", forma: p.method ? METODO_PAGAMENTO_LABEL[p.method] ?? p.method : "—", valor: formatCurrency(Number(p.amount)), status: PAGAMENTO_STATUS_LABEL[p.status] ?? p.status },
        numeric: Number(p.amount), dateKey: formatDf(new Date(p.created_at), "dd/MM"),
      }));
    case "estoque":
      return raw.products.map((p) => ({ row: { produto: p.name, categoria: p.category ?? "Sem categoria", estoque: `${p.stock_qty} ${p.unit}`, valor: formatCurrency(Number(p.cost_price ?? 0) * p.stock_qty) }, numeric: Number(p.cost_price ?? 0) * p.stock_qty }));
    case "servicos": {
      const porServico = new Map<string, { nome: string; qtd: number; receita: number }>();
      filterAppointments(raw.appointments, filters).filter((a) => a.status === "completed").forEach((a) => {
        const acc = porServico.get(a.service_id) ?? { nome: a.services?.name ?? "—", qtd: 0, receita: 0 };
        acc.qtd += 1; acc.receita += Number(a.price);
        porServico.set(a.service_id, acc);
      });
      return Array.from(porServico.values()).map((s) => ({ row: { servico: s.nome, atendimentos: s.qtd, receita: formatCurrency(s.receita), ticket_medio: formatCurrency(s.qtd ? s.receita / s.qtd : 0) }, numeric: s.receita }));
    }
    case "profissionais": {
      const porProf = new Map<string, { nome: string; qtd: number; receita: number }>();
      filterAppointments(raw.appointments, filters).filter((a) => a.status === "completed").forEach((a) => {
        const acc = porProf.get(a.professional_id) ?? { nome: a.professionals?.name ?? "—", qtd: 0, receita: 0 };
        acc.qtd += 1; acc.receita += Number(a.price);
        porProf.set(a.professional_id, acc);
      });
      return Array.from(porProf.values()).map((s) => ({ row: { profissional: s.nome, atendimentos: s.qtd, receita: formatCurrency(s.receita), ticket_medio: formatCurrency(s.qtd ? s.receita / s.qtd : 0) }, numeric: s.receita }));
    }
  }
}

/** Executa a config salva sobre o mesmo dado bruto já carregado — nenhuma query nova por relatório personalizado. */
export function useCustomReportContent(
  report: Tables<"custom_reports"> | null,
  raw: RelatoriosRawData,
  filters: RelatoriosFilters
): { content: ReportContent | null; isLoading: boolean } {
  const content = useMemo<ReportContent | null>(() => {
    if (!report) return null;
    const source = report.source as CustomSourceKey;
    const def = CUSTOM_SOURCES.find((s) => s.key === source);
    if (!def) return null;
    const config = report.config as unknown as CustomReportConfig;
    const cols = (config.columns?.length ? config.columns : def.columns.map((c) => c.key)).filter((k) => def.columns.some((c) => c.key === k));
    const columns = cols.map((k) => def.columns.find((c) => c.key === k)!);
    const items = baseRows(source, raw, filters);

    if (!config.groupBy || def.groupByOptions.length === 0) {
      const rows = items.map((i) => Object.fromEntries(cols.map((k) => [k, i.row[k] ?? ""])));
      const total = def.measureLabel ? items.reduce((s, i) => s + i.numeric, 0) : null;
      return {
        kpis: [{ label: "Registros", value: String(items.length) }, ...(total != null ? [{ label: `Total (${def.measureLabel})`, value: formatCurrency(total) }] : [])],
        chart: null, columns, rows,
        emptyMessage: items.length === 0 ? "Nenhum dado encontrado para esses filtros no período." : undefined,
      };
    }

    // agrupado
    const dimKey = config.groupBy;
    const grupos = new Map<string, { count: number; soma: number }>();
    items.forEach((i) => {
      const k = dimKey === "dia" ? (i.dateKey ?? "—") : String(i.row[dimKey] ?? "—");
      const acc = grupos.get(k) ?? { count: 0, soma: 0 };
      acc.count += 1; acc.soma += i.numeric;
      grupos.set(k, acc);
    });
    const linhasAgrupadas = Array.from(grupos.entries()).map(([nome, v]) => ({ [def.groupByOptions.find((g) => g.key === dimKey)?.label ?? dimKey]: nome, "Registros": v.count, ...(def.measureLabel ? { [def.measureLabel]: formatCurrency(v.soma) } : {}) }));
    const dimLabel = def.groupByOptions.find((g) => g.key === dimKey)?.label ?? dimKey;
    return {
      kpis: [{ label: "Registros", value: String(items.length) }, { label: "Grupos", value: String(grupos.size) }],
      chart: config.visualization === "table" || config.visualization === "kpi" ? null : (
        <SimpleGroupedChart data={Array.from(grupos.entries()).map(([nome, v]) => ({ nome, valor: v.soma }))} tipo={config.visualization} />
      ),
      columns: [{ key: dimLabel, label: dimLabel }, { key: "Registros", label: "Registros" }, ...(def.measureLabel ? [{ key: def.measureLabel, label: def.measureLabel }] : [])],
      rows: linhasAgrupadas,
      emptyMessage: items.length === 0 ? "Nenhum dado encontrado para esses filtros no período." : undefined,
    };
  }, [report, raw, filters]);

  return { content, isLoading: false };
}

export function filterConfigForSource(source: CustomSourceKey): { usesPeriodo: boolean; extraFilters: ExtraFilterKey[] } {
  const def = CUSTOM_SOURCES.find((s) => s.key === source)!;
  return { usesPeriodo: def.usesPeriodo, extraFilters: def.extraFilters };
}

// Mesmo problema e mesma correção do report-content.tsx: o tooltip do
// recharts fica sempre no DOM (só invisível) e sem limite de largura —
// um rótulo de grupo comprido "vazava" a página inteira.
function truncateLabel(label: unknown, max = 28): string {
  const s = String(label ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
const TOOLTIP_WRAPPER_STYLE = { maxWidth: 260 };

function SimpleGroupedChart({ data, tipo }: { data: { nome: string; valor: number }[]; tipo: "bar" | "line" }) {
  if (data.length === 0) return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>;
  if (tipo === "line") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => truncateLabel(v, 14)} />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip labelFormatter={(l) => truncateLabel(l)} wrapperStyle={TOOLTIP_WRAPPER_STYLE} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
          <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => truncateLabel(v, 14)} />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip labelFormatter={(l) => truncateLabel(l)} wrapperStyle={TOOLTIP_WRAPPER_STYLE} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
        <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
