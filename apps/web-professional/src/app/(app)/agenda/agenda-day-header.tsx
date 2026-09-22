"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIA_SEMANA_EXTENSO = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function parseDiaLocal(dia: string): Date {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Hoje ‹ 10 de setembro de 2026, quinta-feira ›" — navegação de dia a dia
 * da Agenda. Substitui o `<input type="date">` cru; pular pra uma data
 * distante continua possível pelo mini calendário ao lado. */
export function AgendaDayHeader({
  dia,
  hojeStr,
  onChangeDia,
}: {
  dia: string;
  hojeStr: string;
  onChangeDia: (novoDia: string) => void;
}) {
  const data = parseDiaLocal(dia);
  const label = `${data.getDate()} de ${MESES_EXTENSO[data.getMonth()]} de ${data.getFullYear()}`;
  const diaSemana = DIA_SEMANA_EXTENSO[data.getDay()];

  function somarDias(delta: number) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + delta);
    onChangeDia(`${nova.getFullYear()}-${String(nova.getMonth() + 1).padStart(2, "0")}-${String(nova.getDate()).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => onChangeDia(hojeStr)} disabled={dia === hojeStr}>
        Hoje
      </Button>
      <div className="flex items-center rounded-lg border border-input bg-card">
        <button
          type="button"
          onClick={() => somarDias(-1)}
          aria-label="Dia anterior"
          className="p-2 rounded-l-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="px-1 sm:px-2 text-sm min-w-0">
          <span className="font-medium">{label}</span>
          <span className="hidden sm:inline text-muted-foreground">, {diaSemana}</span>
        </div>
        <button
          type="button"
          onClick={() => somarDias(1)}
          aria-label="Próximo dia"
          className="p-2 rounded-r-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
