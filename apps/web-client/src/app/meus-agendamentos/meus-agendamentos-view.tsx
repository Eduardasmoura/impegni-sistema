"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Clock, MapPin, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado", in_progress: "Em andamento", completed: "Concluído", canceled: "Cancelado", no_show: "Não compareceu",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-primary", in_progress: "text-chart-4", completed: "text-chart-2", canceled: "text-muted-foreground", no_show: "text-destructive",
};

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  status: string;
  price: number;
  companies: { name: string; slug: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
};

export function MeusAgendamentosView({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [cancelando, setCancelando] = useState<AppointmentRow | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["my-appointments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, price, companies(name, slug), services(name), professionals(name), clients!inner(user_id)")
        .eq("clients.user_id", userId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AppointmentRow[];
    },
  });

  async function cancelar() {
    if (!cancelando) return;
    // O trigger enforce_client_appointment_update (migration 004) garante que
    // esta é a única mudança que um cliente pode fazer no próprio agendamento.
    const { error } = await supabase.from("appointments").update({ status: "canceled" }).eq("id", cancelando.id);
    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-appointments", userId] });
    toast({ title: "Agendamento cancelado" });
    setCancelando(null);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-semibold mb-1">Meus agendamentos</h1>
      <p className="text-sm text-muted-foreground mb-6">Seu histórico e próximos horários em todas as empresas</p>

      {!isLoading && appointments.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarX2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Você ainda não tem agendamentos.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {appointments.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.services?.name} — {a.companies?.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {formatDateTime(a.scheduled_at)}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {a.professionals?.name}</p>
                <p className={cn("text-xs font-medium mt-1", STATUS_COLOR[a.status])}>{STATUS_LABEL[a.status] || a.status}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading font-semibold text-primary">{formatCurrency(Number(a.price))}</p>
                {a.status === "scheduled" && (
                  <button onClick={() => setCancelando(a)} className="mt-2 text-xs text-destructive hover:underline flex items-center gap-1 ml-auto">
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar agendamento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cancelando && `${cancelando.services?.name} em ${formatDateTime(cancelando.scheduled_at)} — essa ação não pode ser desfeita.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(null)}>Voltar</Button>
            <Button variant="destructive" onClick={cancelar}>Cancelar agendamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
