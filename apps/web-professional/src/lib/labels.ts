// Rótulos em PT-BR pros valores reais dos CHECK constraints do banco —
// centralizados aqui pra não duplicar entre telas (Agenda, Dashboard,
// Financeiro etc. compartilham o mesmo vocabulário de status/forma de
// pagamento).

// appointments.status (ver migration 004_appointments_payments_expenses_products)
export const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em andamento",
  completed: "Finalizado",
  canceled: "Cancelado",
  no_show: "Não compareceu",
};

// payments.method (ver migration 004_appointments_payments_expenses_products;
// 'package' e 'online' adicionados na migration 071c/072, Fase 5)
export const METODO_PAGAMENTO_LABEL: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  package: "Pacote",
  online: "Pagamento online",
};

// payments.status (pagamento avulso de agendamento — migration 072, Fase 5)
export const PAGAMENTO_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  refunded: "Estornado",
  overdue: "Atrasado",
  canceled: "Cancelado",
};

// subscriptions.status — mesmo vocabulário já usado em
// apps/web-superadmin/.../empresa-detail-view.tsx, reaproveitado aqui pra
// "Meu plano" mostrar o status com o mesmo rótulo que o Super Admin usa.
export const ASSINATURA_STATUS_LABEL: Record<string, string> = {
  trial: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  suspended: "Suspensa",
  canceled: "Cancelada",
  expired: "Expirada",
  deleted: "Excluída",
};

// subscription_payments.status (eventos do webhook do Asaas)
export const PAGAMENTO_ASSINATURA_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  received: "Recebido",
  overdue: "Atrasado",
  refunded: "Estornado",
  deleted: "Removido",
};
