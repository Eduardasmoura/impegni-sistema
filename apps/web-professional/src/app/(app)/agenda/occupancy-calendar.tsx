"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export type DiaOcupacao = { capacityMin: number; occupiedMin: number; appointmentCount: number; occupancyPct: number };

type Nivel = "sem_expediente" | "verde" | "amarelo" | "laranja" | "vermelho";

// Classificação pedida: capacidade 0 (folga/férias/sem expediente) fica
// numa faixa neutra à parte; senão 0-40% verde, 41-70% amarelo, 71-90%
// laranja, >90% vermelho.
export function nivelOcupacao(pct: number, capacityMin: number): Nivel {
  if (capacityMin <= 0) return "sem_expediente";
  if (pct <= 40) return "verde";
  if (pct <= 70) return "amarelo";
  if (pct <= 90) return "laranja";
  return "vermelho";
}

const COR_LINHA: Record<Nivel, string> = {
  sem_expediente: "bg-muted-foreground/30",
  verde: "bg-emerald-500",
  amarelo: "bg-yellow-400",
  laranja: "bg-orange-500",
  vermelho: "bg-red-500",
};

function toDateStr(y: number, m: number, day: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function OccupancyCalendar({
  year,
  month, // 0-indexado
  onMonthChange,
  occupancyByDay,
  loading,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  occupancyByDay: Map<string, DiaOcupacao>;
  loading?: boolean;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}) {
  const hoje = useMemo(() => new Date(), []);
  const hojeStr = toDateStr(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const primeiroDiaSemana = new Date(year, month, 1).getDay();
  const diasNoMes = new Date(year, month + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
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
          const info = occupancyByDay.get(dateStr);
          const nivel = info ? nivelOcupacao(info.occupancyPct, info.capacityMin) : null;
          const selecionado = selectedDate === dateStr;
          const ehHoje = dateStr === hojeStr;

          // Todo dia continua clicável (passado inclusive) — o profissional
          // sempre pode conferir o que já aconteceu; só a criação de NOVO
          // agendamento é bloqueada pra dias passados (na tela de detalhe).
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              aria-label={
                !info
                  ? `Dia ${dia}`
                  : nivel === "sem_expediente"
                    ? `Dia ${dia}, sem expediente`
                    : `Dia ${dia}, ${info.appointmentCount} atendimento${info.appointmentCount === 1 ? "" : "s"}, ${info.occupancyPct.toFixed(0)}% de ocupação`
              }
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center gap-1.5 text-xs sm:text-sm border transition-colors cursor-pointer",
                passado && "text-muted-foreground/60",
                !passado && "text-foreground",
                !selecionado && "border-border hover:border-primary/50 hover:bg-muted/50",
                selecionado && "border-primary bg-primary/10 text-primary font-semibold",
                ehHoje && !selecionado && "ring-1 ring-primary/40"
              )}
            >
              <span>{dia}</span>
              {/* Linha fina de ocupação — não pinta o fundo do dia inteiro. */}
              {nivel && <span className={cn("w-4 sm:w-5 h-[3px] rounded-full", COR_LINHA[nivel])} />}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Baixa ocupação</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Moderada</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Alta</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Lotado</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Sem expediente</span>
      </div>
    </div>
  );
}
