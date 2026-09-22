// "Adicionar à minha agenda" — gera o evento (links do Google/Outlook e .ics)
// SEM OAuth e SEM guardar credencial: o usuário confirma o salvamento na
// própria agenda. Não é sincronização: cancelar/remarcar no Impegni não mexe
// num evento já adicionado (ver `uid`/`sequence`, pensados pra isso).
//
// Fuso: `appointments.scheduled_at` é um instante absoluto (timestamptz). O
// evento sai sempre em UTC ("Z"), então cada calendário mostra o horário certo
// no fuso do próprio usuário — nenhuma conversão de fuso/DST feita aqui.
//
// Este arquivo é idêntico em web-professional e web-client (o repo não tem
// pacote compartilhado) — altere os dois juntos.
import type { SupabaseClient } from "@supabase/supabase-js";

export type CalendarAudience = "client" | "professional";

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location: string | null;
  start: Date;
  end: Date;
  /** quando o agendamento mudou pela última vez (vira DTSTAMP/SEQUENCE) */
  updatedAt: Date;
  filename: string;
};

export class CalendarEventError extends Error {
  code: "not_found" | "inactive";
  constructor(code: "not_found" | "inactive", message: string) {
    super(message);
    this.code = code;
  }
}

const ACTIVE_STATUSES = ["scheduled", "in_progress"];
export const isCalendarEligible = (status: string) => ACTIVE_STATUSES.includes(status);

// ---------- formatação ----------

const pad = (n: number) => String(n).padStart(2, "0");
/** 20260925T170000Z */
export function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Remove caracteres de controle (protege o .ics e as URLs de quebra de estrutura). */
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r/g, "");

export function icsEscape(s: string): string {
  return clean(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Dobra a linha em 75 octetos (UTF-8) sem cortar um caractere no meio. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = ch;
      curBytes = b;
      limit = 74; // continuação começa com 1 espaço
    } else {
      cur += ch;
      curBytes += b;
    }
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

export function buildIcs(ev: CalendarEvent): string {
  // SEQUENCE cresce a cada alteração do agendamento: ao reimportar o arquivo de
  // um agendamento remarcado (mesmo UID), os apps atualizam o evento em vez de
  // duplicar. Segundos desde 1970 cabem em inteiro de 32 bits até 2038.
  const sequence = Math.floor(ev.updatedAt.getTime() / 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Impegni//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${utcStamp(ev.updatedAt)}`,
    `DTSTART:${utcStamp(ev.start)}`,
    `DTEND:${utcStamp(ev.end)}`,
    `SEQUENCE:${sequence}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape(ev.description)}`,
    ...(ev.location ? [`LOCATION:${icsEscape(ev.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: clean(ev.title),
    dates: `${utcStamp(ev.start)}/${utcStamp(ev.end)}`,
    details: clean(ev.description),
  });
  if (ev.location) p.set("location", clean(ev.location));
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: ev.start.toISOString().replace(/\.\d{3}Z$/, "Z"),
    enddt: ev.end.toISOString().replace(/\.\d{3}Z$/, "Z"),
    subject: clean(ev.title),
    body: clean(ev.description),
  });
  if (ev.location) p.set("location", clean(ev.location));
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

// ---------- montagem do evento ----------

type CompanyAddress = {
  name: string;
  address: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

/** Endereço cadastrado do estabelecimento; null se não houver (nunca inventa). */
export function formatLocation(c: Omit<CompanyAddress, "name">): string | null {
  const t = (v: string | null) => (v ?? "").trim();
  if (t(c.street)) {
    const rua = [t(c.street), t(c.address_number)].filter(Boolean).join(", ");
    const comp = t(c.complement) ? ` - ${t(c.complement)}` : "";
    const cidade = [t(c.city), t(c.state)].filter(Boolean).join("/");
    return [rua + comp, t(c.neighborhood), cidade, t(c.zip_code)].filter(Boolean).join(", ");
  }
  return t(c.address) || null;
}

export type AppointmentForCalendar = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  updated_at: string;
  services: { name: string } | null;
  professionals: { name: string } | null;
  companies: CompanyAddress | null;
  clients?: { name: string; phone: string | null } | null;
};

export function buildCalendarEvent(a: AppointmentForCalendar, audience: CalendarAudience): CalendarEvent {
  const start = new Date(a.scheduled_at);
  const end = new Date(start.getTime() + a.duration_min * 60_000);
  const servico = a.services?.name ?? "Atendimento";
  const empresa = a.companies?.name ?? "";
  const linhas = ["Agendamento realizado pelo Impegni."];
  let title: string;

  if (audience === "professional") {
    // Agenda pessoal do PROFISSIONAL: cliente e telefone (o profissional já os vê no painel).
    const cliente = a.clients?.name ?? "Cliente";
    title = `${servico} — ${cliente}`;
    linhas.push(`Cliente: ${cliente}`);
    if (a.clients?.phone) linhas.push(`Telefone: ${a.clients.phone}`);
    linhas.push(`Serviço: ${servico}`);
  } else {
    // Agenda pessoal do CLIENTE: só o necessário — sem dados de outras pessoas,
    // valores, ficha de anamnese ou observações internas.
    title = empresa ? `${servico} — ${empresa}` : servico;
    linhas.push(`Serviço: ${servico}`);
    if (a.professionals?.name) linhas.push(`Profissional: ${a.professionals.name}`);
    if (empresa) linhas.push(`Estabelecimento: ${empresa}`);
  }

  return {
    // estável por agendamento — baixar de novo gera o MESMO UID
    uid: `${a.id}@impegni.app`,
    title,
    description: linhas.join("\n"),
    location: a.companies ? formatLocation(a.companies) : null,
    start,
    end,
    updatedAt: new Date(a.updated_at),
    filename: `impegni-agendamento-${a.id.slice(0, 8)}.ics`,
  };
}

/**
 * Lê o agendamento NA HORA, com a sessão do próprio usuário — a RLS do banco é
 * quem decide o que ele pode ver (empresa A nunca lê agendamento da empresa B).
 * Nada vem do que a tela mandou: só o id. Para o cliente, `clients` nem é pedido.
 */
export async function loadCalendarEvent(
  supabase: SupabaseClient,
  appointmentId: string,
  audience: CalendarAudience,
): Promise<CalendarEvent> {
  const company = "companies(name, address, street, address_number, complement, neighborhood, city, state, zip_code)";
  const select = `id, scheduled_at, duration_min, status, updated_at, services(name), professionals(name), ${company}${audience === "professional" ? ", clients(name, phone)" : ""}`;
  const { data, error } = await supabase.from("appointments").select(select).eq("id", appointmentId).maybeSingle();
  if (error) throw error;
  if (!data) throw new CalendarEventError("not_found", "Agendamento não encontrado.");
  const row = data as unknown as AppointmentForCalendar & { status: string };
  if (!isCalendarEligible(row.status)) {
    throw new CalendarEventError("inactive", "Este agendamento não está mais ativo.");
  }
  return buildCalendarEvent(row, audience);
}
