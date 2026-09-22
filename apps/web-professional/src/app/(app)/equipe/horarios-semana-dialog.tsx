"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

// Domingo=0..Sábado=6 — mesma convenção da coluna `weekday` no banco
// (extract(dow from date)), sem nenhuma conversão. Ordem de exibição
// Segunda→Domingo (mais natural pra semana de trabalho), não a ordem
// numérica da coluna.
const DIAS = [
  { weekday: 1, label: "Segunda" },
  { weekday: 2, label: "Terça" },
  { weekday: 3, label: "Quarta" },
  { weekday: 4, label: "Quinta" },
  { weekday: 5, label: "Sexta" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

type DiaForm = { weekday: number; active: boolean; start_time: string; end_time: string };

/**
 * Expediente por dia da semana — evolução de `professionals.start_time`/
 * `end_time` (continuam existindo, viram o valor de partida/fallback pra
 * quem nunca abrir esta tela). Salva as 7 linhas de uma vez em
 * `professional_weekly_hours`; o backend (`get_professional_hours_for_day`,
 * usado por `get_availability_day/month`, pelo trigger de validação de
 * horário e por `get_professional_occupancy_month`) já sabe priorizar
 * essas linhas sobre o campo legado — nenhuma outra tela (calendário de
 * ocupação, agendamento público, reagendar) precisou mudar.
 */
export function HorariosSemanaDialog({
  open,
  onOpenChange,
  professional,
  companyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional: Tables<"professionals">;
  companyId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [dias, setDias] = useState<DiaForm[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data: existentes, isFetching } = useQuery({
    queryKey: ["weekly-hours", professional.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_weekly_hours")
        .select("weekday, active, start_time, end_time")
        .eq("professional_id", professional.id);
      if (error) throw error;
      return data;
    },
  });

  // Pré-preenche com o que já está salvo por dia; pros dias sem linha
  // própria ainda, usa start_time/end_time atuais do profissional (o que
  // já está valendo hoje) como ponto de partida — não um formulário vazio.
  useEffect(() => {
    if (!open || existentes === undefined) return;
    const porDia = new Map(existentes.map((d) => [d.weekday, d]));
    const legadoInicio = (professional.start_time ?? "09:00").slice(0, 5);
    const legadoFim = (professional.end_time ?? "18:00").slice(0, 5);
    setDias(
      DIAS.map((d) => {
        const linha = porDia.get(d.weekday);
        if (!linha) return { weekday: d.weekday, active: true, start_time: legadoInicio, end_time: legadoFim };
        return {
          weekday: d.weekday,
          active: linha.active,
          start_time: (linha.start_time ?? legadoInicio).slice(0, 5),
          end_time: (linha.end_time ?? legadoFim).slice(0, 5),
        };
      })
    );
  }, [open, existentes, professional.start_time, professional.end_time]);

  function atualizarDia(weekday: number, patch: Partial<DiaForm>) {
    setDias((atual) => atual?.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)) ?? null);
  }

  async function salvar() {
    if (!dias) return;
    setSalvando(true);
    const payload = dias.map((d) => ({
      company_id: companyId,
      professional_id: professional.id,
      weekday: d.weekday,
      active: d.active,
      start_time: d.active ? d.start_time : null,
      end_time: d.active ? d.end_time : null,
    }));
    const { error } = await supabase.from("professional_weekly_hours").upsert(payload, { onConflict: "professional_id,weekday" });
    setSalvando(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "salvar os horários"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["weekly-hours", professional.id] });
    qc.invalidateQueries({ queryKey: ["occupancy-month", companyId] });
    toast({ title: "Horários atualizados" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Horários de atendimento — {professional.name}</DialogTitle></DialogHeader>
        {isFetching || !dias ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : (
          <div className="space-y-1">
            {DIAS.map((d) => {
              const dia = dias.find((x) => x.weekday === d.weekday)!;
              return (
                <div key={d.weekday} className="flex items-center gap-3 py-2 border-b border-border last:border-0 flex-wrap">
                  <span className="w-16 text-sm font-medium shrink-0">{d.label}</span>
                  {dia.active ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        aria-label={`${d.label} — início`}
                        value={dia.start_time}
                        onChange={(e) => atualizarDia(d.weekday, { start_time: e.target.value })}
                        className="w-[110px]"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <Input
                        type="time"
                        aria-label={`${d.label} — fim`}
                        value={dia.end_time}
                        onChange={(e) => atualizarDia(d.weekday, { end_time: e.target.value })}
                        className="w-[110px]"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground flex-1">Fechado</span>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <span className="text-xs text-muted-foreground">{dia.active ? "Ativo" : "Fechado"}</span>
                    <Switch
                      checked={dia.active}
                      onCheckedChange={(v) => atualizarDia(d.weekday, { active: v })}
                      aria-label={`${d.label} — ${dia.active ? "ativo" : "fechado"}`}
                    />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-2">
              Bloqueios pontuais, folgas e férias continuam em <span className="font-medium">Agenda → Bloqueios, folgas e férias</span> — isto aqui é só o expediente que se repete toda semana.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={salvar} disabled={salvando || !dias}>{salvando ? "Salvando..." : "Salvar horários"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
