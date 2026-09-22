"use client";

import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERIODOS_PRINCIPAIS, PERIODOS_TODOS, type DashboardFilters, type Periodo } from "./filters";

// Barra de período — as 4 opções originais continuam existindo e
// funcionando (Hoje/Semana/Mês/Ano); a engrenagem abre o painel de filtros
// avançados, que inclui essas 4 + as novas (Ontem, Semana passada, Mês
// passado, Ano passado, Personalizado) já em sincronia com esta barra.
export function FiltersBar({
  periodo,
  onPeriodoChange,
  activeFilterCount,
  onOpenAdvanced,
}: {
  periodo: Periodo;
  onPeriodoChange: (p: Periodo) => void;
  activeFilterCount: number;
  onOpenAdvanced: () => void;
}) {
  const periodoAtualNaoPrincipal = !PERIODOS_PRINCIPAIS.some((p) => p.key === periodo);

  return (
    <div className="flex items-center gap-2">
      {/* Desktop: segmentado com as 4 opções principais */}
      <div className="hidden sm:flex gap-1 bg-muted rounded-lg p-1">
        {PERIODOS_PRINCIPAIS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodoChange(p.key)}
            className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", periodo === p.key ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}
          >
            {p.label}
          </button>
        ))}
        {/* Se um período "fora dos 4 principais" estiver ativo (ex: Ontem, Personalizado), mostra o rótulo dele também. */}
        {periodoAtualNaoPrincipal && (
          <span className="px-3 py-1.5 rounded-md text-sm bg-card shadow-sm font-medium text-primary">
            {PERIODOS_TODOS.find((p) => p.key === periodo)?.label}
          </span>
        )}
      </div>

      {/* Mobile: select nativo compacto */}
      <select
        value={periodo}
        onChange={(e) => onPeriodoChange(e.target.value as Periodo)}
        className="sm:hidden h-9 rounded-lg border border-input bg-card px-2 text-sm"
        aria-label="Período"
      >
        {PERIODOS_TODOS.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={onOpenAdvanced}
        title="Configurar filtros"
        aria-label="Configurar filtros"
        className="relative p-2 rounded-lg border border-input bg-card hover:bg-muted transition-colors shrink-0"
      >
        <Settings2 className="w-4 h-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  );
}
