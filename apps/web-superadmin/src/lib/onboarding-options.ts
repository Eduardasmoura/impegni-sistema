// Rótulos de exibição pros valores gravados no cadastro do trial
// (`companies.business_size`/`staff_size_range`, `company_goals.goal_key`)
// — mesma lista de `apps/web-professional/src/lib/onboarding-options.ts`.
// Cada app mantém sua própria cópia (sem pacote compartilhado no
// workspace, ver CLAUDE.md); aqui só é usada pra exibir, nunca pra gravar.

export const BUSINESS_SIZE_LABEL: Record<string, string> = {
  unico: "Estabelecimento único",
  rede: "Rede",
  franquia: "Franquia",
};

export const STAFF_SIZE_LABEL: Record<string, string> = {
  "1": "1 profissional",
  "2": "2 profissionais",
  "3_5": "3 a 5 profissionais",
  "6_10": "6 a 10 profissionais",
  "11_20": "11 a 20 profissionais",
  "21_30": "21 a 30 profissionais",
  over_30: "Mais de 30 profissionais",
};

export const GOAL_LABEL: Record<string, string> = {
  divulgar_servicos: "Divulgar serviços",
  organizar_agenda: "Organizar a agenda",
  agendamento_online: "Agendamento online",
  autonomia_clientes: "Autonomia pros clientes",
  gestao_fiscal: "Gestão fiscal",
  pagamentos_equipe: "Pagamentos da equipe",
  financeiro: "Administrar o financeiro",
  agenda_equipe: "Agenda da equipe",
  fidelizar_clientes: "Fidelizar clientes",
  nenhuma: "Nenhum objetivo específico",
};
