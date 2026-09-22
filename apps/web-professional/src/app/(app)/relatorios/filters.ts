import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

/**
 * Período global da Central de Relatórios — conjunto PRÓPRIO (não é o
 * mesmo do Dashboard nem o do Financeiro): o pedido aqui foi
 * explicitamente "Hoje / 7 dias / 30 dias / Este mês / Mês anterior /
 * Este trimestre / Este ano / Personalizado", com "Este mês"/"Este
 * trimestre"/"Este ano" como unidade de calendário corrente (do dia 1 até
 * hoje), não janela rolante — é o que faz sentido pra "análise do
 * negócio" (comparar com o fechamento do mês, não com "os últimos 30
 * dias" de novo, que já é a opção anterior da lista).
 */
export type PeriodoRelatorio = "hoje" | "7dias" | "30dias" | "mes_atual" | "mes_anterior" | "trimestre_atual" | "ano_atual" | "personalizado";

export const PERIODOS_RELATORIO: { key: PeriodoRelatorio; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7dias", label: "7 dias" },
  { key: "30dias", label: "30 dias" },
  { key: "mes_atual", label: "Este mês" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "trimestre_atual", label: "Este trimestre" },
  { key: "ano_atual", label: "Este ano" },
  { key: "personalizado", label: "Personalizado" },
];

export function resolveReportPeriodRange(
  periodo: PeriodoRelatorio,
  custom: { start: Date | null; end: Date | null },
  agora: Date = new Date()
): { start: Date; end: Date } {
  switch (periodo) {
    case "hoje":
      return { start: startOfDay(agora), end: agora };
    case "7dias":
      return { start: startOfDay(subDays(agora, 6)), end: agora };
    case "30dias":
      return { start: startOfDay(subDays(agora, 29)), end: agora };
    case "mes_atual":
      return { start: startOfMonth(agora), end: agora };
    case "mes_anterior": {
      const mesAnterior = subMonths(agora, 1);
      return { start: startOfMonth(mesAnterior), end: endOfMonth(mesAnterior) };
    }
    case "trimestre_atual":
      return { start: startOfQuarter(agora), end: agora };
    case "ano_atual":
      return { start: startOfYear(agora), end: agora };
    case "personalizado":
      return {
        start: custom.start ? startOfDay(custom.start) : startOfDay(agora),
        end: custom.end ? endOfDay(custom.end) : endOfDay(agora),
      };
  }
}

/**
 * Filtros avançados — mesmo vocabulário/formato de `DashboardFilters`
 * (professionalIds/serviceIds/status/paymentMethods, "vazio = todos") pra
 * não inventar uma segunda convenção; só o período muda de tipo. Cada
 * categoria decide quais destes realmente se aplicam (ver
 * `report-registry.ts`) — Estoque, por ex., não usa nenhum.
 */
export type RelatoriosFilters = {
  periodo: PeriodoRelatorio;
  customStart: Date | null;
  customEnd: Date | null;
  professionalIds: string[];
  serviceIds: string[];
  status: string[];
  paymentMethods: string[];
};

export const DEFAULT_RELATORIOS_FILTERS: RelatoriosFilters = {
  periodo: "30dias",
  customStart: null,
  customEnd: null,
  professionalIds: [],
  serviceIds: [],
  status: [],
  paymentMethods: [],
};
