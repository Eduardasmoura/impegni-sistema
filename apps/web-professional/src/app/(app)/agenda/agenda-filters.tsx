"use client";

import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABEL } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

export type AgendaFiltrosState = {
  status: string | null;
  clientId: string | null;
  serviceId: string | null;
};

const TODOS = "__todos__";

/**
 * Filtros por Status/Cliente/Serviço — não existiam antes na Agenda (só
 * Profissional existia). São filtros puramente client-side sobre os dados
 * do dia já carregados (nenhuma query nova, nenhuma regra de negócio nova).
 * "Sala/espaço" não entra aqui: não existe esse conceito no banco hoje.
 */
export function AgendaFiltros({
  filtros,
  onChange,
  clientesDoDia,
  servicosDoDia,
}: {
  filtros: AgendaFiltrosState;
  onChange: (f: AgendaFiltrosState) => void;
  clientesDoDia: { id: string; name: string }[];
  servicosDoDia: Tables<"services">[];
}) {
  const algumFiltroAtivo = !!(filtros.status || filtros.clientId || filtros.serviceId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p>
        {algumFiltroAtivo && (
          <button
            type="button"
            onClick={() => onChange({ status: null, clientId: null, serviceId: null })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={filtros.status ?? TODOS} onValueChange={(v) => onChange({ ...filtros, status: v === TODOS ? null : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Cliente</label>
          <Select value={filtros.clientId ?? TODOS} onValueChange={(v) => onChange({ ...filtros, clientId: v === TODOS ? null : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {clientesDoDia.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Serviço</label>
          <Select value={filtros.serviceId ?? TODOS} onValueChange={(v) => onChange({ ...filtros, serviceId: v === TODOS ? null : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {servicosDoDia.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
