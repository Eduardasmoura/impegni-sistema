import { startOfDay, endOfDay, subDays, subWeeks, startOfWeek, endOfWeek, subMonths, startOfMonth, endOfMonth, subYears, startOfYear, endOfYear } from "date-fns";

// Período central do Dashboard — as 4 opções originais (hoje/semana/mes/ano)
// continuam funcionando exatamente como antes (janela "rolante" até agora,
// mesmo cálculo que já existia, só trocado de mutação manual de `Date` pro
// date-fns); as novas ("_passado", "ontem", "personalizado") usam limites de
// verdade (dia/semana/mês/ano civil fechado), porque não faz sentido uma
// janela "rolante" pra algo que já passou.
export type Periodo = "hoje" | "ontem" | "semana" | "semana_passada" | "mes" | "mes_passado" | "ano" | "ano_passado" | "personalizado";

export const PERIODOS_PRINCIPAIS: { key: Periodo; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
];

export const PERIODOS_TODOS: { key: Periodo; label: string }[] = [
  ...PERIODOS_PRINCIPAIS,
  { key: "ontem", label: "Ontem" },
  { key: "semana_passada", label: "Semana passada" },
  { key: "mes_passado", label: "Mês passado" },
  { key: "ano_passado", label: "Ano passado" },
  { key: "personalizado", label: "Personalizado" },
];

// Estrutura pensada pra crescer — um filtro novo (categoria, faixa de
// valor etc.) é só mais um campo opcional aqui, "vazio/null = todos", sem
// mexer na assinatura de quem já consome `DashboardFilters`.
export type DashboardFilters = {
  periodo: Periodo;
  customStart: Date | null; // só usado quando periodo === "personalizado"
  customEnd: Date | null;
  professionalIds: string[]; // vazio = todos
  serviceIds: string[]; // vazio = todos
  status: string[]; // vazio = todos (valores de appointments.status)
  paymentMethods: string[]; // vazio = todos (valores de payments.method)
  clientId: string | null; // null = todos
};

export const DEFAULT_FILTERS: DashboardFilters = {
  periodo: "hoje",
  customStart: null,
  customEnd: null,
  professionalIds: [],
  serviceIds: [],
  status: [],
  paymentMethods: [],
  clientId: null,
};

/** Quantos filtros AVANÇADOS estão ativos — período não conta (sempre tem um valor). */
export function countActiveFilters(f: DashboardFilters): number {
  let n = 0;
  if (f.professionalIds.length > 0) n += 1;
  if (f.serviceIds.length > 0) n += 1;
  if (f.status.length > 0) n += 1;
  if (f.paymentMethods.length > 0) n += 1;
  if (f.clientId) n += 1;
  return n;
}

/**
 * Janela imediatamente anterior, com a MESMA duração do período atual —
 * usada só pra "comparação com período anterior" (Desempenho financeiro).
 * Não reaproveita os períodos "_passado" fixos (que são unidades de
 * calendário fechadas) porque aqui o que importa é durar o mesmo tanto de
 * tempo que o período atual, pra a comparação ser de fato equivalente
 * (ex.: período "Personalizado" de 10 dias compara com os 10 dias
 * anteriores, não com "o mês passado inteiro").
 */
export function resolvePreviousPeriodRange(atual: { start: Date; end: Date }): { start: Date; end: Date } {
  const duracaoMs = atual.end.getTime() - atual.start.getTime();
  return { start: new Date(atual.start.getTime() - duracaoMs), end: new Date(atual.start.getTime() - 1) };
}

/** Resolve o período escolhido num intervalo fechado [start, end] de verdade. */
export function resolvePeriodRange(f: Pick<DashboardFilters, "periodo" | "customStart" | "customEnd">, agora: Date = new Date()): { start: Date; end: Date } {
  switch (f.periodo) {
    case "hoje":
      return { start: startOfDay(agora), end: agora };
    case "ontem": {
      const ontem = subDays(agora, 1);
      return { start: startOfDay(ontem), end: endOfDay(ontem) };
    }
    case "semana":
      // Preserva o comportamento original: últimos 7 dias corridos até agora.
      return { start: subDays(agora, 7), end: agora };
    case "semana_passada": {
      const inicioSemanaPassada = startOfWeek(subWeeks(agora, 1), { weekStartsOn: 0 });
      return { start: inicioSemanaPassada, end: endOfWeek(inicioSemanaPassada, { weekStartsOn: 0 }) };
    }
    case "mes":
      return { start: subMonths(agora, 1), end: agora };
    case "mes_passado": {
      const mesPassado = subMonths(agora, 1);
      return { start: startOfMonth(mesPassado), end: endOfMonth(mesPassado) };
    }
    case "ano":
      return { start: subYears(agora, 1), end: agora };
    case "ano_passado": {
      const anoPassado = subYears(agora, 1);
      return { start: startOfYear(anoPassado), end: endOfYear(anoPassado) };
    }
    case "personalizado":
      return {
        start: f.customStart ? startOfDay(f.customStart) : startOfDay(agora),
        end: f.customEnd ? endOfDay(f.customEnd) : endOfDay(agora),
      };
  }
}
