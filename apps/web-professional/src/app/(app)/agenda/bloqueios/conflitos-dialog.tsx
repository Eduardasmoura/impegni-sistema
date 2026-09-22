"use client";

import { useState } from "react";
import { CalendarClock, XCircle, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { ReagendarStaffDialog } from "../reagendar-staff-dialog";

export type Conflito = {
  appointment_id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  client_name: string;
  service_name: string;
  service_id: string;
};

/**
 * Mostrado antes de criar um bloqueio/folga/férias quando já existem
 * agendamentos no período. Regra explícita: NUNCA cancela/move nada
 * sozinho — só informa e deixa a pessoa decidir, por agendamento
 * (Reagendar/Cancelar) ou criar o bloqueio mesmo assim e tratar depois.
 */
export function ConflitosDialog({
  open,
  conflitos,
  companyId,
  professionalId,
  onVoltar,
  onCriarMesmoAssim,
  criando,
}: {
  open: boolean;
  conflitos: Conflito[];
  companyId: string;
  professionalId: string;
  onVoltar: () => void;
  onCriarMesmoAssim: () => void;
  criando: boolean;
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [resolvidos, setResolvidos] = useState<Set<string>>(new Set());
  const [cancelando, setCancelando] = useState<Conflito | null>(null);
  const [salvandoCancelamento, setSalvandoCancelamento] = useState(false);
  const [reagendando, setReagendando] = useState<Conflito | null>(null);

  async function confirmarCancelamento() {
    if (!cancelando) return;
    setSalvandoCancelamento(true);
    const { error } = await supabase.from("appointments").update({ status: "canceled" }).eq("id", cancelando.appointment_id);
    setSalvandoCancelamento(false);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "cancelar o agendamento"), variant: "destructive" });
      return;
    }
    setResolvidos((prev) => new Set(prev).add(cancelando.appointment_id));
    toast({ title: "Agendamento cancelado" });
    setCancelando(null);
  }

  const pendentes = conflitos.filter((c) => !resolvidos.has(c.appointment_id));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onVoltar()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-chart-4" />
              Existem {pendentes.length} agendamento{pendentes.length === 1 ? "" : "s"} neste período
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Criar o bloqueio não cancela nem move esses agendamentos automaticamente. Reagende ou cancele cada um, ou crie o bloqueio mesmo assim e resolva depois.
          </p>
          <div className="space-y-2">
            {conflitos.map((c) => {
              const resolvido = resolvidos.has(c.appointment_id);
              return (
                <Card key={c.appointment_id} className={resolvido ? "opacity-50" : undefined}>
                  <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.service_name} · {formatDateTime(c.scheduled_at)}</p>
                    </div>
                    {!resolvido && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReagendando(c)}>
                          <CalendarClock className="w-3.5 h-3.5" /> Reagendar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setCancelando(c)}>
                          <XCircle className="w-3.5 h-3.5" /> Cancelar
                        </Button>
                      </div>
                    )}
                    {resolvido && <span className="text-xs text-muted-foreground shrink-0">Resolvido</span>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onVoltar} disabled={criando}>Voltar</Button>
            <Button onClick={onCriarMesmoAssim} disabled={criando}>
              {criando ? "Criando..." : "Criar mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!cancelando}
        title="Cancelar agendamento?"
        description={cancelando ? `"${cancelando.client_name}" · ${cancelando.service_name} em ${formatDateTime(cancelando.scheduled_at)} será cancelado.` : ""}
        loading={salvandoCancelamento}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCancelando(null)}
      />

      {reagendando && (
        <ReagendarStaffDialog
          open={!!reagendando}
          onOpenChange={(o) => !o && setReagendando(null)}
          appointmentId={reagendando.appointment_id}
          companyId={companyId}
          professionalId={professionalId}
          serviceId={reagendando.service_id}
          servicoNome={reagendando.service_name}
          clienteNome={reagendando.client_name}
          onReagendado={() => {
            setResolvidos((prev) => new Set(prev).add(reagendando.appointment_id));
            setReagendando(null);
          }}
        />
      )}
    </>
  );
}
