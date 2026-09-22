// Timezone por empresa (`companies.timezone`, migration
// 20260922000000_company_timezone.sql — padrão 'America/Sao_Paulo' para
// toda empresa existente, nenhum comportamento mudou até alguém configurar
// outro fuso).
//
// Sem pacote compartilhado entre os apps (ver CLAUDE.md) — cópia idêntica
// existe em apps/web-client/src/lib/timezone.ts.
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte uma data/hora "de parede" — o que a pessoa escolheu na tela,
 * sem fuso embutido, ex.: data="2026-09-25", time="14:00" — para o
 * instante UTC correto, no fuso informado.
 *
 * Problema real que isto resolve: `new Date(`${data}T${time}:00`).toISOString()`
 * interpreta a data/hora no fuso do DISPOSITIVO de quem está usando o
 * app — certo só por coincidência quando profissional, cliente e empresa
 * estão todos no mesmo fuso do aparelho. Esta função sempre usa o fuso da
 * EMPRESA, não o do navegador.
 *
 * Implementação sem dependência nova: usa `Intl.DateTimeFormat` (suportado
 * nativamente por qualquer runtime moderno) para descobrir o offset do
 * fuso alvo no instante escolhido, em vez de uma tabela de fusos própria.
 * Não resolve o caso raro de um horário ambíguo bem na virada de horário
 * de verão de um fuso que ainda o tenha (o Brasil não tem DST desde 2019).
 */
export function zonedTimeToUtcIso(dateStr: string, timeStr: string, timeZone: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  // Chute inicial: trata os números escolhidos como se já fossem UTC.
  const guessMillis = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = timeZoneOffsetMinutesAt(guessMillis, timeZone);
  return new Date(guessMillis - offsetMinutes * 60000).toISOString();
}

/** Offset (em minutos, a somar a um instante UTC pra obter a hora local) do fuso `timeZone` no instante `utcMillis`. */
function timeZoneOffsetMinutesAt(utcMillis: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMillis));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - utcMillis) / 60000;
}
