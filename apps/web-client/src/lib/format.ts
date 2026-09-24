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
