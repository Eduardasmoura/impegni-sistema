"use client";

import { Filter, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, METODO_PAGAMENTO_LABEL } from "@/lib/labels";
import { PERIODOS_RELATORIO, type RelatoriosFilters } from "./filters";
import type { CategoryDef } from "./report-registry";
import type { Tables } from "@/lib/supabase/database.types";

/**
 * Faixa de filtros globais da Central — o MESMO estado de filtro vale pra
 * qualquer relatório aberto (é o pedido explícito de "filtros
 * consistentes entre os relatórios"). O que muda por categoria é só quais
 * campos aparecem (`categoria.usesPeriodo` / `categoria.extraFilters`),
 * nunca o formato do filtro em si.
 */
export function RelatoriosFilterBar({
  categoria,
  filtros,
  onChange,
  services,
  professionals,
}: {
  categoria: CategoryDef;
  filtros: RelatoriosFilters;
  onChange: (next: RelatoriosFilters) => void;
  services: Pick<Tables<"services">, "id" | "name">[];
  professionals: Pick<Tables<"professionals">, "id" | "name">[];
}) {
  const temFiltroExtra = categoria.extraFilters.length > 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Filter className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-medium">Filtros</span>
            <p className="text-xs text-muted-foreground">Valem para o relatório aberto nesta categoria</p>
          </div>
        </div>

        {categoria.usesPeriodo ? (
          <>
            <div className="flex flex-wrap gap-1 bg-muted rounded-lg p-1 w-fit">
              {PERIODOS_RELATORIO.map((p) => (
                <button
                  key={p.key}
                  onClick={() => onChange({ ...filtros, periodo: p.key })}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap",
                    filtros.periodo === p.key ? "bg-card shadow-sm font-medium" : "text-muted-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filtros.periodo === "personalizado" && (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 max-w-md">
                <div>
                  <Label htmlFor="rel-data-de" className="text-xs">De</Label>
                  <Input
                    id="rel-data-de"
                    type="date"
                    value={filtros.customStart ? filtros.customStart.toISOString().slice(0, 10) : ""}
                    onChange={(e) => onChange({ ...filtros, customStart: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="rel-data-ate" className="text-xs">Até</Label>
                  <Input
                    id="rel-data-ate"
                    type="date"
                    value={filtros.customEnd ? filtros.customEnd.toISOString().slice(0, 10) : ""}
                    onChange={(e) => onChange({ ...filtros, customEnd: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" /> Esta categoria mostra o estado atual — o período selecionado não se aplica aqui.
          </p>
        )}

        {temFiltroExtra && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t">
            {categoria.extraFilters.includes("professional") && (
              <div className="pt-3">
                <Label className="text-xs">Profissional</Label>
                <Select
                  value={filtros.professionalIds[0] ?? "all"}
                  onValueChange={(v) => onChange({ ...filtros, professionalIds: v === "all" ? [] : [v] })}
                >
                  <SelectTrigger aria-label="Filtrar por profissional"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {categoria.extraFilters.includes("service") && (
              <div className="pt-3">
                <Label className="text-xs">Serviço</Label>
                <Select
                  value={filtros.serviceIds[0] ?? "all"}
                  onValueChange={(v) => onChange({ ...filtros, serviceIds: v === "all" ? [] : [v] })}
                >
                  <SelectTrigger aria-label="Filtrar por serviço"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os serviços</SelectItem>
                    {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {categoria.extraFilters.includes("paymentMethod") && (
              <div className="pt-3">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select
                  value={filtros.paymentMethods[0] ?? "all"}
                  onValueChange={(v) => onChange({ ...filtros, paymentMethods: v === "all" ? [] : [v] })}
                >
                  <SelectTrigger aria-label="Filtrar por forma de pagamento"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(METODO_PAGAMENTO_LABEL).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {categoria.extraFilters.includes("status") && (
              <div className="pt-3">
                <Label className="text-xs">Status</Label>
                <Select
                  value={filtros.status[0] ?? "all"}
                  onValueChange={(v) => onChange({ ...filtros, status: v === "all" ? [] : [v] })}
                >
                  <SelectTrigger aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(STATUS_LABEL).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
