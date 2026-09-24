"use client";

import { useState } from "react";
import { CalendarClock, Play, Pause, Check, X, HandCoins, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddToCalendarButton } from "@/components/add-to-calendar";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { STATUS_LABEL, CAUCAO_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useToast } from "@/components/ui/use-toast";
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
  deposit,
  onDepositReviewed,
  onOpenChange,
  onMudarStatus,
  onReagendar,
}: {
  appointment: Tables<"appointments">;
  clientName: string;
  service: Tables<"services"> | undefined;
  professionalName: string | undefined;
  deposit?: Tables<"appointment_deposits">;
  onDepositReviewed?: () => void;
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
          {deposit && <CaucaoSection key={deposit.id + deposit.status} deposit={deposit} onReviewed={onDepositReviewed} />}
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

// Caução pago DIRETO ao estabelecimento: o Impegni só registra o que o
// cliente informou e a decisão do estabelecimento (sem movimentar dinheiro).
function CaucaoSection({ deposit, onReviewed }: { deposit: Tables<"appointment_deposits">; onReviewed?: () => void }) {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState<"confirmed" | "rejected" | null>(null);
  const [status, setStatus] = useState(deposit.status);
  const info = CAUCAO_STATUS[status] ?? CAUCAO_STATUS.pending;
  const podeRevisar = status === "pending" || status === "reported";

  async function revisar(novo: "confirmed" | "rejected") {
    if (enviando) return;
    setEnviando(novo);
    const { error } = await createClient().rpc("review_appointment_deposit", { p_deposit_id: deposit.id, p_status: novo });
    setEnviando(null);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar o caução"), variant: "destructive" });
      return;
    }
    setStatus(novo);
    onReviewed?.();
    toast({ title: novo === "confirmed" ? "Caução confirmado" : "Caução recusado" });
  }

  return (
    <div data-testid="caucao-agendamento" className="min-w-0 rounded-lg border border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium"><HandCoins className="w-4 h-4 text-muted-foreground" /> Caução</span>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full text-center", info.className)}>{info.label}</span>
      </div>
      {status === "reported" && <p className="text-xs font-medium">Caução informado como pago pelo cliente</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <span className="text-muted-foreground">Valor</span>
        <span className="font-medium">{formatCurrency(Number(deposit.amount))} <span className="text-xs text-muted-foreground font-normal">({Number(deposit.percent)}% · {deposit.method === "link" ? "link" : "Pix"})</span></span>
      </div>
      {podeRevisar && (
        <>
          <p className="text-[11px] text-muted-foreground">Confira no seu banco ou provedor antes de confirmar — o Impegni não processa esse pagamento.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" className="gap-1.5 flex-1" disabled={!!enviando} onClick={() => revisar("confirmed")}>
              {enviando === "confirmed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Confirmar pagamento
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 flex-1" disabled={!!enviando} onClick={() => revisar("rejected")}>
              {enviando === "rejected" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Recusar pagamento
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
