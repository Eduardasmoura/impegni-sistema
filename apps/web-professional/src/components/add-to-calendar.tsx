"use client";

// "Adicionar à minha agenda" — componente único, usado no Web Professional e no
// Web Client (arquivo idêntico nos dois apps). Recebe só o id do agendamento:
// o evento é montado a partir de uma leitura feita agora, com a sessão do
// usuário (RLS decide o que ele pode ver). Sem OAuth, sem credenciais.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarPlus, Download, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarEventError, buildIcs, googleCalendarUrl, isCalendarEligible, loadCalendarEvent, outlookCalendarUrl,
  type CalendarAudience, type CalendarEvent,
} from "@/lib/calendar-event";

function baixarIcs(ev: CalendarEvent, abrirNoApp: boolean) {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  // iPhone/iPad: abrir o .ics direto oferece "Adicionar ao Calendário"
  if (abrirNoApp) {
    window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = ev.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

function quando(ev: CalendarEvent) {
  const dia = ev.start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const h = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} · ${h(ev.start)} – ${h(ev.end)}`;
}

const OPCAO = "w-full flex items-center gap-3 rounded-xl border border-border px-3.5 py-3 text-left text-sm font-medium hover:bg-muted/60 hover:border-primary/40 transition-colors";

export function AddToCalendarDialog({
  open, onOpenChange, appointmentId, audience,
}: { open: boolean; onOpenChange: (o: boolean) => void; appointmentId: string; audience: CalendarAudience }) {
  const supabase = createClient();
  const { data: ev, isLoading, error } = useQuery({
    queryKey: ["calendar-event", appointmentId, audience],
    enabled: open,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => loadCalendarEvent(supabase, appointmentId, audience),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarPlus className="w-4 h-4" /> Adicionar à minha agenda</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : error || !ev ? (
          <div className="flex gap-2 items-start text-sm text-destructive py-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{error instanceof CalendarEventError ? error.message : "Não foi possível preparar o evento. Tente de novo."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-3.5 text-sm">
              <p className="font-medium">{ev.title}</p>
              <p className="text-muted-foreground mt-0.5">{quando(ev)}</p>
              {ev.location && <p className="text-muted-foreground mt-1 flex gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />{ev.location}</p>}
            </div>
            <div className="space-y-2">
              <a href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" className={OPCAO}>
                <CalendarPlus className="w-4 h-4 text-primary" /> <span className="flex-1">Google Agenda</span> <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <a href={outlookCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" className={OPCAO}>
                <CalendarPlus className="w-4 h-4 text-primary" /> <span className="flex-1">Outlook</span> <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
              <button type="button" onClick={() => baixarIcs(ev, isIOS())} className={OPCAO}>
                <CalendarPlus className="w-4 h-4 text-primary" /> <span className="flex-1">Apple Calendar</span>
              </button>
              <button type="button" onClick={() => baixarIcs(ev, false)} className={OPCAO}>
                <Download className="w-4 h-4 text-primary" /> <span className="flex-1">Baixar arquivo .ics</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Você confirma o evento na sua própria agenda — o Impegni não acessa sua conta. Se o horário mudar depois, adicione de novo.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Botão + janela. `status` (opcional) esconde o botão em agendamentos cancelados/concluídos. */
export function AddToCalendarButton({
  appointmentId, audience, status, label = "Adicionar à minha agenda", variant = "outline", size = "sm", className,
}: {
  appointmentId: string;
  audience: CalendarAudience;
  status?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (status !== undefined && !isCalendarEligible(status)) return null;
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className ?? "gap-1.5"} onClick={() => setOpen(true)}>
        <CalendarPlus className="w-3.5 h-3.5" /> {label}
      </Button>
      <AddToCalendarDialog open={open} onOpenChange={setOpen} appointmentId={appointmentId} audience={audience} />
    </>
  );
}
