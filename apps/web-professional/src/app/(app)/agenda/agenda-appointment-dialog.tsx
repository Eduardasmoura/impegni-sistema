"use client";

import { CalendarClock, Play, Pause, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddToCalendarButton } from "@/components/add-to-calendar";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";

/**
 * Detalhe de um agendamento, aberto ao clicar no bloco da timeline.
 * Não é uma tela nova de regra de negócio — é a MESMA ação (mudarStatus,
 * abrir o reagendamento) que já existia como ícones soltos no card da lista
 * antiga, só que agora atrás de um clique no bloco (blocos da timeline são
 * pequenos demais pra caber 4 ícones dentro, principalmente em atendimentos
 * curtos de 15-20min).
 */
export function AgendaAppointmentDialog({
  appointment,
  clientName,
  service,
  professionalName,
  onOpenChange,
  onMudarStatus,
  onReagendar,
}: {
  appointment: Tables<"appointments">;
  clientName: string;
  service: Tables<"services"> | undefined;
  professionalName: string | undefined;
  onOpenChange: (open: boolean) => void;
  onMudarStatus: (a: Tables<"appointments">, status: string) => void;
  onReagendar: (a: Tables<"appointments">) => void;
}) {
  const a = appointment;
  const podeAgir = a.status === "scheduled" || a.status === "in_progress";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {clientName}
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-full",
                a.status === "canceled" && "bg-destructive/10 text-destructive",
                a.status === "completed" && "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))]",
                a.status === "in_progress" && "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))]",
                a.status === "no_show" && "bg-muted text-muted-foreground",
                a.status === "scheduled" && "bg-primary/10 text-[hsl(var(--primary-emphasis))]"
              )}
            >
              {STATUS_LABEL[a.status] || a.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Serviço</span>
            <span className="font-medium">{service?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Data e horário</span>
            <span className="font-medium tabular-nums">{formatDate(a.scheduled_at)} · {formatTime(a.scheduled_at)} ({a.duration_min}min)</span>
          </div>
          {professionalName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Profissional</span>
              <span className="font-medium">{professionalName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-medium">{formatCurrency(Number(a.price))}</span>
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap gap-2 sm:justify-start">
          <AddToCalendarButton appointmentId={a.id} audience="professional" status={a.status} />
          {a.status === "scheduled" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onReagendar(a)}>
              <CalendarClock className="w-3.5 h-3.5" /> Reagendar
            </Button>
          )}
          {a.status === "scheduled" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onMudarStatus(a, "in_progress")}>
              <Play className="w-3.5 h-3.5" /> Iniciar
            </Button>
          )}
          {a.status === "in_progress" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onMudarStatus(a, "scheduled")}>
              <Pause className="w-3.5 h-3.5" /> Voltar para agendado
            </Button>
          )}
          {podeAgir && (
            <>
              <Button size="sm" className="gap-1.5" onClick={() => onMudarStatus(a, "completed")}>
                <Check className="w-3.5 h-3.5" /> Concluir
              </Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onMudarStatus(a, "canceled")}>
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
