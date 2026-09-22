"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityCalendar } from "../[slug]/agendar/availability-calendar";

/**
 * Fase 5, Parte 8 — reagendamento do lado do cliente. Reaproveita o mesmo
 * calendário/grade de horários do fluxo de agendar (get_availability_month/
 * day, já consideram expediente/bloqueios/outros agendamentos) e termina
 * numa RPC só (reschedule_appointment) que reautoriza e revalida tudo de
 * novo no servidor — nenhuma checagem de conflito é feita aqui no front.
 */
export function ReagendarDialog({
  open,
  onOpenChange,
  appointmentId,
  companyId,
  professionalId,
  serviceId,
  servicoNome,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  companyId: string;
  professionalId: string;
  serviceId: string;
  servicoNome: string;
  userId: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const agora = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(agora.getFullYear());
  const [viewMonth, setViewMonth] = useState(agora.getMonth());
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setViewYear(agora.getFullYear());
      setViewMonth(agora.getMonth());
      setData("");
      setHora("");
    }
  }, [open, agora]);

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const { data: monthRows = [], isFetching: carregandoMes } = useQuery({
    queryKey: ["reagendar-availability-month", companyId, professionalId, serviceId, monthKey],
    enabled: open,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_availability_month", {
        p_company_id: companyId, p_professional_id: professionalId, p_service_id: serviceId, p_month: monthKey,
      });
      if (error) throw error;
      return rows ?? [];
    },
  });
  const countsByDay = useMemo(() => new Map(monthRows.map((r) => [r.day, r.available_count])), [monthRows]);

  const { data: horariosDoDia = [], isFetching: carregandoHorarios } = useQuery({
    queryKey: ["reagendar-availability-day", companyId, professionalId, serviceId, data],
    enabled: open && !!data,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_availability_day", {
        p_company_id: companyId, p_professional_id: professionalId, p_service_id: serviceId, p_day: data,
      });
      if (error) throw error;
      return (rows ?? []).map((r) => r.slot_time.slice(0, 5));
    },
  });

  async function confirmar() {
    if (!data || !hora) return;
    setSalvando(true);
    const novoHorario = new Date(`${data}T${hora}:00`).toISOString();
    const { error } = await supabase.rpc("reschedule_appointment", { p_appointment_id: appointmentId, p_new_scheduled_at: novoHorario });
    setSalvando(false);
    if (error) {
      toast({ title: "Não foi possível reagendar", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-appointments", userId] });
    toast({ title: "Agendamento remarcado", description: `Novo horário: ${new Date(novoHorario).toLocaleString("pt-BR")}` });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Reagendar — {servicoNome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <AvailabilityCalendar
              year={viewYear}
              month={viewMonth}
              onMonthChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
              countsByDay={countsByDay}
              loading={carregandoMes}
              selectedDate={data || null}
              onSelectDate={(d) => { setData(d); setHora(""); }}
            />
          </div>
          {data && (
            <div>
              <label className="text-sm font-medium">Horários disponíveis</label>
              {carregandoHorarios ? (
                <p className="text-sm text-muted-foreground mt-2">Carregando horários...</p>
              ) : horariosDoDia.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">Nenhum horário disponível neste dia.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {horariosDoDia.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHora(h)}
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${hora === h ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 text-primary hover:bg-primary/10"}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!data || !hora || salvando} className="gap-2">
            {salvando ? "Remarcando..." : <><Check className="w-4 h-4" /> Confirmar novo horário</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
