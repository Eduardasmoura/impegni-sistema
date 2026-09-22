"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, METODO_PAGAMENTO_LABEL } from "@/lib/labels";
import { PERIODOS_TODOS, DEFAULT_FILTERS, type DashboardFilters, type Periodo } from "./filters";
import { PeriodRangePicker } from "./period-range-picker";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_OPCOES = Object.keys(STATUS_LABEL);
const METODO_OPCOES = Object.keys(METODO_PAGAMENTO_LABEL);

export function AdvancedFiltersDialog({
  open,
  onOpenChange,
  appliedFilters,
  onApply,
  professionals,
  services,
  clients,
  showProfessionalFilter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedFilters: DashboardFilters;
  onApply: (next: DashboardFilters) => void;
  professionals: Tables<"professionals">[];
  services: Tables<"services">[];
  clients: Tables<"clients">[];
  showProfessionalFilter: boolean;
}) {
  // Rascunho separado do estado aplicado — abrir sempre parte da última
  // seleção aplicada (não do padrão), fechar sem "Aplicar filtros" descarta.
  const [draft, setDraft] = useState<DashboardFilters>(appliedFilters);
  const [buscaCliente, setBuscaCliente] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(appliedFilters);
      setBuscaCliente("");
    }
  }, [open, appliedFilters]);

  function toggleEm<K extends "professionalIds" | "serviceIds" | "status" | "paymentMethods">(campo: K, valor: string) {
    setDraft((d) => {
      const atual = d[campo];
      const novo = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
      return { ...d, [campo]: novo };
    });
  }

  const clienteSelecionado = clients.find((c) => c.id === draft.clientId);
  const resultadosBusca = buscaCliente.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(buscaCliente.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Filtros</DialogTitle></DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-sm font-medium mb-2 block">Período</Label>
            <div className="space-y-1.5">
              {PERIODOS_TODOS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="periodo"
                    checked={draft.periodo === p.key}
                    onChange={() => setDraft((d) => ({ ...d, periodo: p.key as Periodo }))}
                    className="accent-primary"
                  />
                  {p.label}
                </label>
              ))}
            </div>
            {draft.periodo === "personalizado" && (
              <div className="mt-3 p-3 rounded-lg border border-border">
                <PeriodRangePicker
                  startDate={draft.customStart}
                  endDate={draft.customEnd}
                  onChange={(start, end) => setDraft((d) => ({ ...d, customStart: start, customEnd: end }))}
                />
              </div>
            )}
          </div>

          {showProfessionalFilter && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Profissional</Label>
              <div className="space-y-1.5">
                {professionals.filter((p) => p.active).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={draft.professionalIds.includes(p.id)} onCheckedChange={() => toggleEm("professionalIds", p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-2 block">Serviço</Label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {services.filter((s) => s.active).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={draft.serviceIds.includes(s.id)} onCheckedChange={() => toggleEm("serviceIds", s.id)} />
                  {s.name}
                </label>
              ))}
              {services.length === 0 && <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado.</p>}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Status do atendimento</Label>
            <div className="space-y-1.5">
              {STATUS_OPCOES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={draft.status.includes(s)} onCheckedChange={() => toggleEm("status", s)} />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Forma de pagamento</Label>
            <div className="space-y-1.5">
              {METODO_OPCOES.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={draft.paymentMethods.includes(m)} onCheckedChange={() => toggleEm("paymentMethods", m)} />
                  {METODO_PAGAMENTO_LABEL[m]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Cliente</Label>
            {clienteSelecionado ? (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border text-sm">
                <span>{clienteSelecionado.name}</span>
                <button type="button" onClick={() => setDraft((d) => ({ ...d, clientId: null }))} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar cliente..." value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} className="pl-8 h-9 text-sm" />
                {resultadosBusca.length > 0 && (
                  <div className="mt-1 rounded-lg border border-border overflow-hidden">
                    {resultadosBusca.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setDraft((d) => ({ ...d, clientId: c.id })); setBuscaCliente(""); }}
                        className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors")}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDraft(DEFAULT_FILTERS)}>Limpar filtros</Button>
          <Button onClick={() => { onApply(draft); onOpenChange(false); }}>Aplicar filtros</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
