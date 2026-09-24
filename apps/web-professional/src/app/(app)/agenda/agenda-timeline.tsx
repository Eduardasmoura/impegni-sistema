"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Coffee, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAUCAO_STATUS } from "@/lib/labels";
import { formatTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

// Altura de cada intervalo de 30min — o mesmo intervalo que a disponibilidade
// pública já usa (get_availability_day retorna slots de 30 em 30). Não é uma
// regra nova, só o valor visual da timeline.
const SLOT_MIN = 30;
const ROW_HEIGHT = 56; // px por slot de 30min — folgado o bastante pro toque no tablet/mobile
const PX_PER_MIN = ROW_HEIGHT / SLOT_MIN;

export type BlockRow = Pick<Tables<"professional_blocks">, "id" | "starts_at" | "ends_at" | "reason" | "type">;

// Cores por status — só os 5 status que existem de verdade em `appointments`
// (STATUS_LABEL, lib/labels.ts). Nada inventado; tons vêm dos tokens já
// definidos em globals.css (--primary, --chart-*, --destructive, --muted),
// não de hex novo.
const STATUS_STYLE: Record<string, { bar: string; bg: string; text: string; muted?: boolean }> = {
  scheduled: { bar: "bg-primary", bg: "bg-primary/10", text: "text-[hsl(var(--primary-emphasis))]" },
  in_progress: { bar: "bg-[hsl(var(--chart-3))]", bg: "bg-[hsl(var(--chart-3)/0.12)]", text: "text-[hsl(var(--chart-3))]" },
  completed: { bar: "bg-[hsl(var(--chart-2))]", bg: "bg-[hsl(var(--chart-2)/0.12)]", text: "text-[hsl(var(--chart-2))]" },
  no_show: { bar: "bg-muted-foreground/50", bg: "bg-muted/70", text: "text-muted-foreground", muted: true },
  canceled: { bar: "bg-destructive/60", bg: "bg-destructive/[0.06]", text: "text-destructive/80", muted: true },
};

const BLOCK_TYPE_INFO: Record<string, { label: string; icon: typeof Ban }> = {
  block: { label: "Bloqueio", icon: Ban },
  day_off: { label: "Folga", icon: Coffee },
  vacation: { label: "Férias", icon: Palmtree },
};

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
function floorToSlot(min: number) {
  return Math.floor(min / SLOT_MIN) * SLOT_MIN;
}
function ceilToSlot(min: number) {
  return Math.ceil(min / SLOT_MIN) * SLOT_MIN;
}
function minutesToLabel(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AgendaTimeline({
  dia,
  ehHoje,
  expedienteInicioMin,
  expedienteFimMin,
  appointments,
  blocks,
  clientNameById,
  serviceById,
  depositByAppointment,
  onSelectAppointment,
}: {
  dia: string;
  ehHoje: boolean;
  /** Expediente do profissional no dia (minutos desde meia-noite) — já vem
   * calculado de fora (professional_weekly_hours com fallback pro legado),
   * a timeline só usa isso pra saber que faixa de horas desenhar. */
  expedienteInicioMin: number;
  expedienteFimMin: number;
  appointments: Tables<"appointments">[];
  blocks: BlockRow[];
  clientNameById: Map<string, string>;
  serviceById: Map<string, Tables<"services">>;
  depositByAppointment?: Map<string, Tables<"appointment_deposits">>;
  onSelectAppointment: (a: Tables<"appointments">) => void;
}) {
  // A faixa visível cobre o expediente, mas nunca corta um agendamento ou
  // bloqueio que caia fora dele (ex.: atendimento remarcado pra antes de
  // abrir) — a timeline se adapta ao dado real, não o contrário.
  const { inicioMin, fimMin } = useMemo(() => {
    let ini = expedienteInicioMin;
    let fim = expedienteFimMin;
    for (const a of appointments) {
      const s = minutesSinceMidnight(new Date(a.scheduled_at));
      ini = Math.min(ini, floorToSlot(s));
      fim = Math.max(fim, ceilToSlot(s + (a.duration_min || 0)));
    }
    for (const b of blocks) {
      ini = Math.min(ini, floorToSlot(minutesSinceMidnight(new Date(b.starts_at))));
      fim = Math.max(fim, ceilToSlot(minutesSinceMidnight(new Date(b.ends_at))));
    }
    if (fim <= ini) fim = ini + 60;
    return { inicioMin: ini, fimMin: fim };
  }, [expedienteInicioMin, expedienteFimMin, appointments, blocks]);

  const totalSlots = Math.max(1, Math.round((fimMin - inicioMin) / SLOT_MIN));
  const rows = Array.from({ length: totalSlots }, (_, i) => inicioMin + i * SLOT_MIN);

  // Horário atual — só quando o dia selecionado é hoje.
  const [agoraMin, setAgoraMin] = useState(() => minutesSinceMidnight(new Date()));
  useEffect(() => {
    if (!ehHoje) return;
    const id = setInterval(() => setAgoraMin(minutesSinceMidnight(new Date())), 60_000);
    return () => clearInterval(id);
  }, [ehHoje]);
  const mostrarAgora = ehHoje && agoraMin >= inicioMin && agoraMin <= fimMin;

  const alturaTotal = totalSlots * ROW_HEIGHT;
  const topFor = (min: number) => (min - inicioMin) * PX_PER_MIN;

  return (
    <div className="relative flex border border-border rounded-xl bg-card overflow-hidden">
      {/* Régua de horas */}
      <div className="w-14 sm:w-16 shrink-0 border-r border-border select-none">
        {rows.map((min) => (
          <div key={min} className="relative" style={{ height: ROW_HEIGHT }}>
            {min % 60 === 0 && (
              <span className="absolute -top-2 right-2 text-[11px] text-muted-foreground font-medium tabular-nums">
                {minutesToLabel(min)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Área da timeline */}
      <div className="relative flex-1 min-w-0" style={{ height: alturaTotal }}>
        {/* Linhas de grade — cheia na hora cheia, tracejada na meia hora */}
        {rows.map((min, i) => (
          <div
            key={min}
            className={cn("absolute left-0 right-0 border-t", min % 60 === 0 ? "border-border" : "border-border/50 border-dashed")}
            style={{ top: i * ROW_HEIGHT }}
          />
        ))}

        {/* Bloqueios / folga / férias / almoço */}
        {blocks.map((b) => {
          const s = Math.max(inicioMin, minutesSinceMidnight(new Date(b.starts_at)));
          const e = Math.min(fimMin, minutesSinceMidnight(new Date(b.ends_at)));
          if (e <= s) return null;
          const info = BLOCK_TYPE_INFO[b.type] ?? BLOCK_TYPE_INFO.block;
          const Icon = info.icon;
          return (
            <div
              key={b.id}
              className="absolute left-1 right-1 rounded-md border border-border/70 flex items-center gap-1.5 px-2 overflow-hidden"
              style={{
                top: topFor(s) + 1,
                height: Math.max(20, topFor(e) - topFor(s) - 2),
                backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--muted-foreground) / 0.09) 0px, hsl(var(--muted-foreground) / 0.09) 6px, transparent 6px, transparent 12px)",
              }}
              title={`${info.label}${b.reason ? " · " + b.reason : ""} · ${formatTime(b.starts_at)}–${formatTime(b.ends_at)}`}
            >
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                {info.label.toUpperCase()}{b.reason ? ` · ${b.reason}` : ""}
              </span>
            </div>
          );
        })}

        {/* Atendimentos — a duração real do serviço define a altura do bloco.
            appointments_no_overlap (constraint no banco) já garante que dois
            atendimentos do mesmo profissional nunca se sobrepõem, então não
            precisa de layout lado-a-lado pra colisão. */}
        {appointments.map((a) => {
          const inicio = minutesSinceMidnight(new Date(a.scheduled_at));
          const fimAt = inicio + (a.duration_min || 0);
          const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.scheduled;
          const servico = serviceById.get(a.service_id);
          const nomeCliente = clientNameById.get(a.client_id) || "Cliente";
          const compacto = fimAt - inicio <= 20;
          const caucao = depositByAppointment?.get(a.id);
          const caucaoInfo = caucao ? CAUCAO_STATUS[caucao.status] : undefined;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAppointment(a)}
              className={cn(
                "absolute left-1 right-1 rounded-md text-left transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden",
                style.bg,
                style.muted && "opacity-70"
              )}
              style={{ top: topFor(inicio) + 1, height: Math.max(18, topFor(fimAt) - topFor(inicio) - 2) }}
            >
              <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", style.bar)} />
              {caucaoInfo && (
                <span title={caucaoInfo.label} aria-label={caucaoInfo.label} className={cn("absolute top-1 right-1 w-2 h-2 rounded-full", caucaoInfo.dot)} />
              )}
              <div className={cn("h-full pl-2.5 pr-2 flex flex-col justify-center min-w-0", compacto ? "py-0" : "py-1")}>
                <p className={cn("text-[13px] font-semibold truncate leading-tight", style.text, style.muted && "line-through decoration-1")}>
                  {nomeCliente}
                </p>
                {!compacto && servico && (
                  <p className="text-xs text-muted-foreground truncate leading-tight">{servico.name}</p>
                )}
                {!compacto && (
                  <p className="text-[11px] text-muted-foreground/70 truncate leading-tight tabular-nums">
                    {formatTime(a.scheduled_at)} – {minutesToLabel(fimAt)}
                  </p>
                )}
              </div>
            </button>
          );
        })}

        {/* Indicador de horário atual */}
        {mostrarAgora && (
          <div className="absolute left-0 right-0 z-10 flex items-center gap-1.5 pointer-events-none" style={{ top: topFor(agoraMin) }}>
            <span className="w-2 h-2 rounded-full bg-destructive -ml-1 shrink-0" />
            <div className="flex-1 h-px bg-destructive/70" />
            <span className="text-[10px] font-semibold text-destructive bg-card px-1 rounded tabular-nums shrink-0">
              {minutesToLabel(agoraMin)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
