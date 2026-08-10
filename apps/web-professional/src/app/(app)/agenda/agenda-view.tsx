"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, Check, X, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado", in_progress: "Em andamento", completed: "Finalizado", canceled: "Cancelado", no_show: "Não compareceu",
};

const NOVO_VAZIO = { clientName: "", clientPhone: "", serviceId: "", professionalId: "", time: "09:00" };

export function AgendaView({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [dia, setDia] = useState(() => toDateStr(new Date()));
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState(NOVO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId).order("scheduled_at").limit(1000);
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });
  const { data: services = [] } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  const doDia = useMemo(
    () => appointments.filter((a) => toDateStr(new Date(a.scheduled_at)) === dia).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [appointments, dia]
  );

  async function mudarStatus(appointment: Tables<"appointments">, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["appointments", companyId] });
  }

  async function criarAgendamento() {
    const servico = services.find((s) => s.id === novo.serviceId);
    if (!servico || !novo.professionalId || !novo.clientName) return;
    setSalvando(true);
    try {
      // Reaproveita o cadastro do cliente pelo telefone, se já existir.
      let clientId: string | null = null;
      if (novo.clientPhone) {
        const existente = clients.find((c) => c.phone === novo.clientPhone);
        if (existente) clientId = existente.id;
      }
      if (!clientId) {
        const { data: novoCliente, error: clientError } = await supabase
          .from("clients")
          .insert({ company_id: companyId, name: novo.clientName, phone: novo.clientPhone || null })
          .select()
          .single();
        if (clientError) throw clientError;
        clientId = novoCliente.id;
      }

      const scheduledAt = new Date(`${dia}T${novo.time}:00`).toISOString();
      const { error: appointmentError } = await supabase.from("appointments").insert({
        company_id: companyId,
        client_id: clientId,
        professional_id: novo.professionalId,
        service_id: novo.serviceId,
        scheduled_at: scheduledAt,
        duration_min: servico.duration_min,
        price: servico.price,
        origin: "staff",
      });
      if (appointmentError) throw appointmentError;

      qc.invalidateQueries({ queryKey: ["appointments", companyId] });
      qc.invalidateQueries({ queryKey: ["clients", companyId] });
      toast({ title: "Agendamento criado" });
      setOpen(false);
      setNovo(NOVO_VAZIO);
    } catch (e) {
      toast({ title: "Erro ao agendar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">{doDia.length} agendamento(s) no dia</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-auto" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo agendamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo agendamento — {dia}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome do cliente</Label><Input value={novo.clientName} onChange={(e) => setNovo({ ...novo, clientName: e.target.value })} /></div>
                  <div><Label>Telefone</Label><Input value={novo.clientPhone} onChange={(e) => setNovo({ ...novo, clientPhone: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Serviço</Label>
                  <Select value={novo.serviceId} onValueChange={(v) => setNovo({ ...novo, serviceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {formatCurrency(Number(s.price))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Profissional</Label>
                  <Select value={novo.professionalId} onValueChange={(v) => setNovo({ ...novo, professionalId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Horário</Label><Input type="time" value={novo.time} onChange={(e) => setNovo({ ...novo, time: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button onClick={criarAgendamento} disabled={salvando || !novo.clientName || !novo.serviceId || !novo.professionalId}>
                  {salvando ? "Agendando..." : "Confirmar agendamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {doDia.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              Nenhum agendamento neste dia.
            </CardContent>
          </Card>
        )}
        {doDia.map((a) => {
          const client = clients.find((c) => c.id === a.client_id);
          const professional = professionals.find((p) => p.id === a.professional_id);
          const service = services.find((s) => s.id === a.service_id);
          return (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="text-center w-14 shrink-0">
                  <p className="text-sm font-semibold">{formatTime(a.scheduled_at)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client?.name || "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {service?.name} · {professional?.name} · {formatCurrency(Number(a.price))} · {STATUS_LABEL[a.status] || a.status}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {a.status === "scheduled" && <IconBtn icon={Play} color="text-chart-2" title="Iniciar" onClick={() => mudarStatus(a, "in_progress")} />}
                  {a.status === "in_progress" && <IconBtn icon={Pause} color="text-chart-4" title="Voltar para agendado" onClick={() => mudarStatus(a, "scheduled")} />}
                  {(a.status === "scheduled" || a.status === "in_progress") && (
                    <>
                      <IconBtn icon={Check} color="text-primary" title="Concluir" onClick={() => mudarStatus(a, "completed")} />
                      <IconBtn icon={X} color="text-destructive" title="Cancelar" onClick={() => mudarStatus(a, "canceled")} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, color, title, onClick }: { icon: typeof Play; color: string; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} className={cn("p-2 rounded-lg hover:bg-muted", color)}>
      <Icon className="w-4 h-4" />
    </button>
  );
}
