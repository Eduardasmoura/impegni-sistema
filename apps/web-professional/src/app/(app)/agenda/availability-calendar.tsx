"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Cópia local do componente equivalente em `web-client/[slug]/agendar/
// availability-calendar.tsx` — o monorepo é `npm workspaces` só de `apps/*`
// (sem `packages/` compartilhado), então web-professional e web-client não
// compartilham código de UI. A REGRA de disponibilidade não é duplicada
// aqui (mora só nas RPCs `get_availability_month/day`, chamadas idênticas
// dos dois lados) — isto é só o widget visual do calendário, reutilizado
// pelo reagendamento do profissional (`reagendar-staff-dialog.tsx`).

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

type Nivel = "indisponivel" | "vermelho" | "laranja" | "verde";

export function nivelDisponibilidade(count: number): Nivel {
  if (count <= 0) return "indisponivel";
  if (count <= 2) return "vermelho";
  if (count <= 5) return "laranja";
  return "verde";
}

const COR_LINHA: Record<Exclude<Nivel, "indisponivel">, string> = {
  vermelho: "bg-red-500",
  laranja: "bg-amber-500",
  verde: "bg-emerald-500",
};

function toDateStr(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function AvailabilityCalendar({
  year,
  month, // 0-indexado
  onMonthChange,
  countsByDay,
  loading,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  countsByDay: Map<string, number>;
  loading?: boolean;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}) {
  const hoje = useMemo(() => new Date(), []);
  const hojeStr = toDateStr(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const primeiroDiaSemana = new Date(year, month, 1).getDay();
  const diasNoMes = new Date(year, month + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  const podeVoltar = year > hoje.getFullYear() || (year === hoje.getFullYear() && month > hoje.getMonth());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)}
          disabled={!podeVoltar}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="font-heading font-semibold text-sm">{MESES[month]} {year}</p>
        <button
          type="button"
          onClick={() => onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7 gap-1 sm:gap-1.5", loading && "opacity-50 pointer-events-none")}>
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`vazio-${i}`} />;
          const dateStr = toDateStr(year, month, dia);
          const passado = dateStr < hojeStr;
          const count = countsByDay.get(dateStr) ?? 0;
          const nivel = nivelDisponibilidade(count);
          const semVagas = nivel === "indisponivel";
          const clicavel = !passado;
          const selecionado = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!clicavel}
              onClick={() => onSelectDate(dateStr)}
              aria-label={passado ? `Dia ${dia}, data passada` : semVagas ? `Dia ${dia}, sem horários disponíveis` : `Dia ${dia}, ${count} horário${count === 1 ? "" : "s"} disponível${count === 1 ? "" : "eis"}`}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center gap-1.5 text-xs sm:text-sm border transition-colors",
                passado && "text-muted-foreground/30 border-transparent cursor-not-allowed",
                !passado && semVagas && !selecionado && "text-muted-foreground/40 border-transparent hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                !passado && !semVagas && !selecionado && "border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                selecionado && "border-primary bg-primary/10 text-primary font-semibold"
              )}
            >
              <span>{dia}</span>
              {!semVagas && <span className={cn("w-4 sm:w-5 h-[3px] rounded-full", COR_LINHA[nivel as Exclude<Nivel, "indisponivel">])} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Alta disponibilidade</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Disponibilidade moderada</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Poucos horários</span>
      </div>
    </div>
  );
}
