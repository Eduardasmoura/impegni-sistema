import {
  LayoutGrid, TrendingUp, CalendarCheck, Users, Scissors, UserCog, Package, Megaphone, Heart,
} from "lucide-react";

/**
 * Registro central de categorias e relatórios da Central de Relatórios.
 * Reformulação: quase todos os relatórios abaixo agora são REAIS
 * (`status: "available"`, calculados a partir de dado real — ver
 * `report-data.ts` e os `*-reports.tsx` de cada categoria) — só Fidelidade
 * continua vazia porque a funcionalidade não existe no sistema.
 *
 * `reportKey(categoryKey, slug)` é o identificador estável usado por
 * favoritos/histórico/URL — nunca muda o slug de um relatório já existente
 * sem migrar os favoritos de quem já usa (não é o caso ainda, é tudo novo).
 */
export type ExtraFilterKey = "professional" | "service" | "paymentMethod" | "status";
export type ReportStatus = "available" | "planned";

export type ReportDef = {
  slug: string;
  title: string;
  description: string;
  status: ReportStatus;
  keywords: string[]; // termos de busca além do título (ex.: sinônimos)
};

export type CategoryDef = {
  key: string;
  label: string;
  icon: typeof LayoutGrid;
  description: string;
  usesPeriodo: boolean;
  extraFilters: ExtraFilterKey[];
  reports: ReportDef[];
};

export function reportKey(categoryKey: string, slug: string): string {
  return `${categoryKey}.${slug}`;
}

export const REPORT_CATEGORIES: CategoryDef[] = [
  {
    key: "visao-geral",
    label: "Visão geral",
    icon: LayoutGrid,
    description: "Os principais indicadores do negócio no período selecionado.",
    usesPeriodo: true,
    extraFilters: [],
    reports: [],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: TrendingUp,
    description: "Receitas, despesas, pagamentos e comissões.",
    usesPeriodo: true,
    extraFilters: ["professional", "service", "paymentMethod"],
    reports: [
      { slug: "receita", title: "Receita por período", description: "Veja como o faturamento evoluiu ao longo do período selecionado.", status: "available", keywords: ["faturamento", "receita", "vendas"] },
      { slug: "despesas", title: "Despesas por categoria", description: "Para onde está indo o dinheiro do negócio.", status: "available", keywords: ["gastos", "custos"] },
      { slug: "comissoes", title: "Comissões", description: "Repasse aos profissionais — pago e pendente.", status: "available", keywords: ["repasse", "payout"] },
    ],
  },
  {
    key: "agendamentos",
    label: "Agendamentos",
    icon: CalendarCheck,
    description: "Agenda, ocupação, cancelamentos e no-show.",
    usesPeriodo: true,
    extraFilters: ["professional", "service", "status"],
    reports: [
      { slug: "agendamentos", title: "Agendamentos", description: "Volume de agendamentos por período e por profissional.", status: "available", keywords: ["agenda", "volume"] },
      { slug: "ocupacao", title: "Ocupação da agenda", description: "Analise a ocupação dos horários e profissionais.", status: "available", keywords: ["horarios", "capacidade"] },
      { slug: "cancelamentos", title: "Cancelamentos", description: "Cancelamentos e não comparecimentos no período.", status: "available", keywords: ["no-show", "no show", "faltas"] },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    icon: Users,
    description: "Aquisição, recorrência, inatividade e aniversariantes.",
    usesPeriodo: true,
    extraFilters: [],
    reports: [
      { slug: "aquisicao", title: "Aquisição de clientes", description: "Novos clientes cadastrados no período.", status: "available", keywords: ["novos clientes"] },
      { slug: "recorrencia", title: "Clientes recorrentes", description: "Clientes que retornam com regularidade.", status: "available", keywords: ["fidelizacao", "retorno"] },
      { slug: "inatividade", title: "Clientes inativos", description: "Identifique clientes que não possuem agendamento recente.", status: "available", keywords: ["sumidos", "sem retorno"] },
      { slug: "aniversariantes", title: "Aniversariantes", description: "Clientes com aniversário no período.", status: "available", keywords: ["aniversario", "niver"] },
    ],
  },
  {
    key: "servicos",
    label: "Serviços",
    icon: Scissors,
    description: "Desempenho e volume dos serviços.",
    usesPeriodo: true,
    extraFilters: ["professional"],
    reports: [
      { slug: "desempenho", title: "Desempenho dos serviços", description: "Mais realizados, faturamento e ticket médio por serviço.", status: "available", keywords: ["ranking servicos", "mais vendidos"] },
    ],
  },
  {
    key: "equipe",
    label: "Equipe",
    icon: UserCog,
    description: "Desempenho dos profissionais.",
    usesPeriodo: true,
    extraFilters: ["professional"],
    reports: [
      { slug: "desempenho", title: "Desempenho dos profissionais", description: "Atendimentos, faturamento, ticket médio, ocupação e comissões.", status: "available", keywords: ["profissionais", "equipe", "ranking"] },
    ],
  },
  {
    key: "estoque",
    label: "Estoque",
    icon: Package,
    description: "Valor em estoque e itens críticos.",
    usesPeriodo: false,
    extraFilters: [],
    reports: [
      { slug: "critico", title: "Estoque crítico", description: "Itens no ou abaixo do estoque mínimo.", status: "available", keywords: ["falta", "reposicao"] },
      { slug: "valor", title: "Valor em estoque", description: "Valor total investido em estoque hoje.", status: "available", keywords: ["patrimonio"] },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    description: "Cupons, campanhas e avaliações.",
    usesPeriodo: true,
    extraFilters: [],
    reports: [
      { slug: "cupons", title: "Cupons utilizados", description: "Cupons utilizados e descontos concedidos.", status: "available", keywords: ["desconto", "promocao"] },
      { slug: "campanhas", title: "Campanhas", description: "Envios de campanha por status e canal.", status: "available", keywords: ["disparo", "mensagens"] },
      { slug: "avaliacoes", title: "Avaliações", description: "Média e distribuição das avaliações recebidas.", status: "available", keywords: ["nota", "review", "reviews"] },
    ],
  },
  {
    key: "fidelidade",
    label: "Fidelidade",
    icon: Heart,
    description: "Disponível apenas quando o programa de fidelidade existir de fato no sistema.",
    usesPeriodo: false,
    extraFilters: [],
    reports: [],
  },
];

export function findReport(catKey: string, slug: string): { categoria: CategoryDef; relatorio: ReportDef } | null {
  const categoria = REPORT_CATEGORIES.find((c) => c.key === catKey);
  const relatorio = categoria?.reports.find((r) => r.slug === slug);
  return categoria && relatorio ? { categoria, relatorio } : null;
}

export function findReportByKey(key: string): { categoria: CategoryDef; relatorio: ReportDef } | null {
  for (const categoria of REPORT_CATEGORIES) {
    for (const relatorio of categoria.reports) {
      if (reportKey(categoria.key, relatorio.slug) === key) return { categoria, relatorio };
    }
  }
  return null;
}
