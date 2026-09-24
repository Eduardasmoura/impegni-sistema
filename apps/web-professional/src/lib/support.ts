// Vocabulário dos chamados de suporte (public.support_tickets). As chaves de
// categoria são as mesmas do CHECK no banco e do mapa da Edge Function
// create-support-ticket; `duvida` e `sugestao` continuam válidas só para
// exibir chamados antigos.

export const SUPPORT_CATEGORIES = [
  { value: "problema_tecnico", label: "Problema técnico" },
  { value: "agenda", label: "Agenda" },
  { value: "financeiro", label: "Financeiro" },
  { value: "pagamentos", label: "Pagamentos" },
  { value: "pacotes", label: "Pacotes recorrentes" },
  { value: "clientes", label: "Clientes" },
  { value: "conta", label: "Conta" },
  { value: "outro", label: "Outro" },
] as const;

const LEGACY: Record<string, string> = { duvida: "Dúvida sobre o sistema", sugestao: "Sugestão" };

export function supportCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Sem categoria";
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? LEGACY[value] ?? value;
}

// Status do banco → os 3 estados que o profissional vê.
// open / in_progress → Em análise; waiting_company / resolved → Respondido
// (a equipe já respondeu por e-mail); closed → Encerrado.
export type SupportDisplayStatus = { label: string; dot: string; badge: string };

export function supportStatus(status: string): SupportDisplayStatus {
  if (status === "closed") return { label: "Encerrado", dot: "bg-foreground/70", badge: "bg-muted text-foreground/80" };
  if (status === "resolved" || status === "waiting_company") return { label: "Respondido", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" };
  return { label: "Em análise", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" };
}

/** Protocolo curto e estável, derivado do ID do chamado. */
export function supportProtocol(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Categoria de chamado sugerida a partir da categoria de ajuda que o usuário estava lendo. */
export function supportCategoryFromHelp(helpCategory: string | null | undefined): string {
  switch (helpCategory) {
    case "agenda": return "agenda";
    case "clientes":
    case "anamnese": return "clientes";
    case "financeiro":
    case "relatorios": return "financeiro";
    case "pagamentos": return "pagamentos";
    case "pacotes-recorrentes": return "pacotes";
    case "minha-conta": return "conta";
    default: return "";
  }
}
