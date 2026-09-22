// Opções fechadas do cadastro do trial (etapas "Seu negócio" e "Segmento e
// objetivos"). Os `value`s são os mesmos gravados no banco — em
// `companies.business_size`/`staff_size_range` (CHECK constraint) e
// `company_goals.goal_key` — nunca o texto de exibição, pra sobreviver a
// uma futura tradução ou reformulação do rótulo sem migrar dado.

export const BUSINESS_SIZE_OPTIONS = [
  { value: "unico", label: "Estabelecimento único" },
  { value: "rede", label: "Rede" },
  { value: "franquia", label: "Franquia" },
] as const;

export const STAFF_SIZE_OPTIONS = [
  { value: "1", label: "1 profissional" },
  { value: "2", label: "2 profissionais" },
  { value: "3_5", label: "3 a 5 profissionais" },
  { value: "6_10", label: "6 a 10 profissionais" },
  { value: "11_20", label: "11 a 20 profissionais" },
  { value: "21_30", label: "21 a 30 profissionais" },
  { value: "over_30", label: "Mais de 30 profissionais" },
] as const;

// "Nenhuma das opções acima" é mutuamente exclusiva com as demais — ver a
// regra em `steps/step-segment.tsx` — por isso fica de fora da lista
// principal e é tratada à parte onde a UI precisa saber qual é.
export const NO_GOALS_VALUE = "nenhuma";

export const BUSINESS_GOAL_OPTIONS = [
  { value: "divulgar_servicos", label: "Divulgar meus serviços" },
  { value: "organizar_agenda", label: "Organizar minha agenda" },
  { value: "agendamento_online", label: "Implementar agendamento online" },
  { value: "autonomia_clientes", label: "Dar autonomia aos meus clientes" },
  { value: "gestao_fiscal", label: "Gerenciar a parte fiscal" },
  { value: "pagamentos_equipe", label: "Facilitar os pagamentos da equipe" },
  { value: "financeiro", label: "Administrar o financeiro" },
  { value: "agenda_equipe", label: "Gerenciar a agenda da equipe" },
  { value: "fidelizar_clientes", label: "Fidelizar clientes" },
  { value: NO_GOALS_VALUE, label: "Nenhuma das opções acima" },
] as const;
