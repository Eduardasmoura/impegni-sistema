"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function mesmoDia(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Mesma linguagem visual do calendário de disponibilidade do cliente
// (`apps/web-client/.../availability-calendar.tsx`) — grid de mês, navegação
// por chevrons, célula `aspect-square rounded-lg` — só que aqui a seleção é
// um INTERVALO (início→fim) em vez de um dia só.
export function PeriodRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}) {
  const hoje = new Date();
  const [viewYear, setViewYear] = useState((startDate ?? hoje).getFullYear());
  const [viewMonth, setViewMonth] = useState((startDate ?? hoje).getMonth());

  const primeiroDiaSemana = new Date(viewYear, viewMonth, 1).getDay();
  const diasNoMes = new Date(viewYear, viewMonth + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  function mudarMes(y: number, m: number) {
    setViewYear(y);
    setViewMonth(m);
  }

  function clicarDia(dia: number) {
    const clicado = new Date(viewYear, viewMonth, dia);
    // Sem início, ou intervalo já completo (início+fim): começa um intervalo novo.
    if (!startDate || (startDate && endDate)) {
      onChange(clicado, null);
      return;
    }
    // Só início definido: este clique fecha o intervalo (troca se for antes do início).
    if (clicado < startDate) onChange(clicado, startDate);
    else onChange(startDate, clicado);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => mudarMes(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="font-heading font-semibold text-sm">{MESES[viewMonth]} {viewYear}</p>
        <button
          type="button"
          onClick={() => mudarMes(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1)}
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

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`vazio-${i}`} />;
          const data = new Date(viewYear, viewMonth, dia);
          const ehInicio = mesmoDia(data, startDate);
          const ehFim = mesmoDia(data, endDate);
          const noIntervalo = !!startDate && !!endDate && data > startDate && data < endDate;
          const endpoint = ehInicio || ehFim;

          return (
            <button
              key={dia}
              type="button"
              onClick={() => clicarDia(dia)}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm border transition-colors cursor-pointer",
                !endpoint && !noIntervalo && "border-border hover:border-primary/50 hover:bg-muted/50",
                noIntervalo && "border-transparent bg-primary/10 text-primary rounded-none",
                endpoint && "border-primary bg-primary text-primary-foreground font-semibold"
              )}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{startDate ? startDate.toLocaleDateString("pt-BR") : "Selecione o início"}</span>
        <span>→</span>
        <span>{endDate ? endDate.toLocaleDateString("pt-BR") : "Selecione o fim"}</span>
      </div>
    </div>
  );
}
