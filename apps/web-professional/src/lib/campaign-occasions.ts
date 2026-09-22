// Catálogo das ocasiões de campanha e as datas comemorativas (calculadas, não
// fixas no código por ano). "Aniversário" e "Recuperação" são as campanhas
// automáticas já existentes (`campaign_rules`); as demais vão pra `campaigns`.
export type SeasonalOccasion =
  | "dia_das_maes" | "dia_dos_pais" | "dia_do_amigo" | "dia_dos_namorados"
  | "dia_da_mulher" | "dia_do_cliente" | "natal" | "black_friday" | "personalizada";
export type CampaignKind = "birthday" | "recovery" | SeasonalOccasion;

export const OCCASIONS: { key: CampaignKind; label: string; hint: string; message: string }[] = [
  { key: "birthday", label: "Aniversário", hint: "Automática — clientes que fazem aniversário", message: "Parabéns, {nome}! 🎉 Ganhe um mimo especial no seu mês de aniversário." },
  { key: "recovery", label: "Recuperação de clientes", hint: "Automática — clientes que sumiram", message: "Sentimos sua falta, {nome}! Que tal agendar um horário?" },
  { key: "dia_das_maes", label: "Dia das Mães", hint: "2º domingo de maio", message: "Feliz Dia das Mães, {nome}! 💐 Preparamos uma condição especial pra você." },
  { key: "dia_dos_pais", label: "Dia dos Pais", hint: "2º domingo de agosto", message: "Feliz Dia dos Pais, {nome}! Venha se cuidar com um desconto especial." },
  { key: "dia_do_amigo", label: "Dia do Amigo", hint: "20 de julho", message: "Feliz Dia do Amigo, {nome}! Traga um amigo e ganhem uma vantagem juntos." },
  { key: "dia_dos_namorados", label: "Dia dos Namorados", hint: "12 de junho", message: "Feliz Dia dos Namorados, {nome}! ❤️ Agende seu horário e fique ainda mais especial." },
  { key: "dia_da_mulher", label: "Dia da Mulher", hint: "8 de março", message: "Feliz Dia da Mulher, {nome}! 🌷 Temos uma oferta pensada pra você." },
  { key: "dia_do_cliente", label: "Dia do Cliente", hint: "15 de setembro", message: "Hoje é o seu dia, {nome}! Preparamos uma surpresa pra agradecer a sua confiança." },
  { key: "natal", label: "Natal", hint: "25 de dezembro", message: "Feliz Natal, {nome}! 🎄 Confira nossas condições de fim de ano." },
  { key: "black_friday", label: "Black Friday", hint: "Sexta-feira após o Dia de Ação de Graças", message: "Black Friday chegou, {nome}! Aproveite condições imperdíveis por tempo limitado." },
  { key: "personalizada", label: "Personalizada", hint: "Crie a sua, com nome e período próprios", message: "Olá, {nome}! Temos uma novidade pra você." },
];

export function occasionLabel(kind: string): string {
  return OCCASIONS.find((o) => o.key === kind)?.label ?? kind;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function dataDaOcasiao(kind: SeasonalOccasion, year: number): Date | null {
  switch (kind) {
    case "dia_das_maes": return nthWeekday(year, 4, 0, 2);
    case "dia_dos_pais": return nthWeekday(year, 7, 0, 2);
    case "dia_do_amigo": return new Date(year, 6, 20);
    case "dia_dos_namorados": return new Date(year, 5, 12);
    case "dia_da_mulher": return new Date(year, 2, 8);
    case "dia_do_cliente": return new Date(year, 8, 15);
    case "natal": return new Date(year, 11, 25);
    case "black_friday": { const thanksgiving = nthWeekday(year, 10, 4, 4); return new Date(year, 10, thanksgiving.getDate() + 1); }
    default: return null;
  }
}

/** Sugestão de período (7 dias até a data) da próxima ocorrência; null p/ personalizada. */
export function periodoSugerido(kind: CampaignKind, hoje = new Date()): { starts_on: string; ends_on: string } | null {
  if (kind === "birthday" || kind === "recovery" || kind === "personalizada") return null;
  let data = dataDaOcasiao(kind, hoje.getFullYear());
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (data && data < hojeZero) data = dataDaOcasiao(kind, hoje.getFullYear() + 1);
  if (!data) return null;
  const inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate() - 7);
  return { starts_on: iso(inicio), ends_on: iso(data) };
}

export type CampaignStatus = "inativa" | "agendada" | "ativa" | "encerrada";
export function statusDaCampanha(c: { enabled: boolean; starts_on: string | null; ends_on: string | null }, hoje = new Date()): CampaignStatus {
  if (!c.enabled) return "inativa";
  const h = iso(hoje);
  if (c.ends_on && c.ends_on < h) return "encerrada";
  if (c.starts_on && c.starts_on > h) return "agendada";
  return "ativa";
}

/** Link do WhatsApp com a mensagem já preenchida ({nome} substituído). */
export function whatsappLink(phone: string, message: string, nome: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message.replaceAll("{nome}", nome.split(" ")[0]))}`;
}
