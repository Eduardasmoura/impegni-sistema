export function formatCurrency(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Fuso explícito (padrão: o da maioria das empresas; passe companies.timezone
// quando houver). Sem ele, o servidor (UTC na Vercel) e o navegador formatavam
// datas diferentes entre 21h e meia-noite → erro de hidratação React #425/#422.
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export function formatDate(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone });
}

export function formatTime(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function formatDateTime(value: string | Date | null | undefined, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone });
}

// Minutos -> "6h30", "6h" ou "45min" — usado no resumo de ocupação da agenda.
export function formatDuration(minutes: number): string {
  const min = Math.max(0, Math.round(minutes));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

// Domínio da página pública de agendamento (web-client): cada empresa em
// `{slug}.impegni.com.br`. Usado onde o painel mostra/abre o link público.
export const BOOKING_DOMAIN = process.env.NEXT_PUBLIC_BOOKING_DOMAIN || "impegni.com.br";

// Site público (apps/site) — onde ficam Termos de Uso e Política de Privacidade.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://impegni.com.br";
