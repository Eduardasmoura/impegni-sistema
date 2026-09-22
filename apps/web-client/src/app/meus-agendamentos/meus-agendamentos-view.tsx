"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Clock, Loader2, MapPin, X, AlertCircle, Star, CalendarClock, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { AnamneseFicha } from "@/components/anamnese-ficha";
import { ReagendarDialog } from "./reagendar-dialog";
import { AddToCalendarButton } from "@/components/add-to-calendar";

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
  company_id: string;
  service_id: string;
  professional_id: string;
  companies: { name: string; slug: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
  clients: { id: string; user_id: string | null };
};

export function MeusAgendamentosView({ userId, agendadoId }: { userId: string; agendadoId?: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const [cancelando, setCancelando] = useState<AppointmentRow | null>(null);
  const [reagendando, setReagendando] = useState<AppointmentRow | null>(null);
  const [avaliando, setAvaliando] = useState<AppointmentRow | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [bannerFechado, setBannerFechado] = useState(false);
  const [fichaEmpresa, setFichaEmpresa] = useState<{ id: string; nome: string; appointmentId?: string; serviceId?: string } | null>(null);

  const { data: appointments = [], isLoading, isError } = useQuery({
    queryKey: ["my-appointments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, price, company_id, service_id, professional_id, companies(name, slug), services(name), professionals(name), clients!inner(id, user_id)")
        .eq("clients.user_id", userId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AppointmentRow[];
    },
  });

  const { data: avaliacoesFeitas = new Set<string>() } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("appointment_id, clients!inner(user_id)").eq("clients.user_id", userId);
      if (error) throw error;
      return new Set((data || []).map((r) => r.appointment_id));
    },
  });

  // Empresas dos agendamentos que têm ficha de anamnese ativa — atalho pra
  // preencher a ficha sem passar pelo menu da conta. A policy nova só deixa
  // o cliente ver o formulário ativo das empresas onde ele tem cadastro.
  const empresasComAgendamento = Array.from(
    new Map(
      appointments
        .filter((a) => a.companies)
        .map((a) => [a.company_id, a.companies!.name]),
    ).entries(),
  );
  const { data: empresasComFicha = new Set<string>() } = useQuery({
    queryKey: ["anamnese-empresas-agendamento", empresasComAgendamento.map(([id]) => id).sort().join(",")],
    enabled: empresasComAgendamento.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anamnesis_forms")
        .select("company_id")
        .in("company_id", empresasComAgendamento.map(([id]) => id))
        .eq("active", true);
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.company_id));
    },
  });
  const fichasDisponiveis = empresasComAgendamento.filter(([id]) => empresasComFicha.has(id));

  async function enviarAvaliacao() {
    if (!avaliando) return;
    setEnviandoAvaliacao(true);
    const { error } = await supabase.from("reviews").insert({
      company_id: avaliando.company_id,
      client_id: avaliando.clients.id,
      professional_id: avaliando.professional_id,
      service_id: avaliando.service_id,
      appointment_id: avaliando.id,
      rating: nota,
      comment: comentario || null,
    });
    setEnviandoAvaliacao(false);
    if (error) {
      toast({ title: "Erro ao avaliar", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["my-reviews", userId] });
    toast({ title: "Avaliação enviada", description: "Obrigado pelo retorno!" });
    setAvaliando(null);
    setNota(5);
    setComentario("");
  }

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

      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Carregando seus agendamentos...</p>
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-2 text-center text-destructive">
            <AlertCircle className="w-6 h-6" />
            <p className="text-sm">Não foi possível carregar seus agendamentos. Tente novamente em instantes.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && appointments.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarX2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Você ainda não tem agendamentos.
          </CardContent>
        </Card>
      )}

      {agendadoId && !bannerFechado && (() => {
        const novo = appointments.find((x) => x.id === agendadoId);
        if (!novo || (novo.status !== "scheduled" && novo.status !== "in_progress")) return null;
        return (
          <div className="mb-4 rounded-xl border border-chart-2/30 bg-chart-2/10 p-4 flex flex-wrap items-center gap-3" role="status">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold">Agendamento confirmado! 🎉</p>
              <p className="text-xs text-muted-foreground mt-0.5">{novo.services?.name} — {novo.companies?.name} · {formatDateTime(novo.scheduled_at)}</p>
            </div>
            <AddToCalendarButton appointmentId={novo.id} audience="client" variant="default" />
            <button onClick={() => setBannerFechado(true)} className="text-xs text-muted-foreground hover:underline">Fechar</button>
          </div>
        );
      })()}

      {fichasDisponiveis.length > 0 && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
            <ClipboardList className="w-3.5 h-3.5" /> Ficha de anamnese
          </p>
          <div className="flex flex-wrap gap-2">
            {fichasDisponiveis.map(([id, nome]) => (
              <Button
                key={id}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setFichaEmpresa({ id, nome })}
              >
                <ClipboardList className="w-3.5 h-3.5" /> {nome}
              </Button>
            ))}
          </div>
        </div>
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
                <div className="mt-2 flex justify-end"><AddToCalendarButton appointmentId={a.id} audience="client" status={a.status} variant="ghost" label="Adicionar à agenda" className="gap-1.5 h-auto py-1 px-2 text-xs text-primary" /></div>
                {(a.status === "scheduled" || a.status === "in_progress") && empresasComFicha.has(a.company_id) && (
                  <button
                    onClick={() => setFichaEmpresa({ id: a.company_id, nome: a.companies?.name ?? "Empresa", appointmentId: a.id, serviceId: a.service_id })}
                    className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 ml-auto"
                  >
                    <ClipboardList className="w-3 h-3" /> Ficha de anamnese
                  </button>
                )}
                {a.status === "scheduled" && (
                  <div className="mt-2 flex flex-col items-end gap-1">
                    <button onClick={() => setReagendando(a)} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Reagendar
                    </button>
                    <button onClick={() => setCancelando(a)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                  </div>
                )}
                {a.status === "completed" && !avaliacoesFeitas.has(a.id) && (
                  <button onClick={() => setAvaliando(a)} className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
                    <Star className="w-3 h-3" /> Avaliar
                  </button>
                )}
                {a.status === "completed" && avaliacoesFeitas.has(a.id) && (
                  <p className="mt-2 text-xs text-muted-foreground ml-auto">Avaliado</p>
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

      <Dialog open={!!avaliando} onOpenChange={(o) => !o && setAvaliando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Avaliar atendimento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {avaliando && `${avaliando.services?.name} com ${avaliando.professionals?.name} — ${avaliando.companies?.name}`}
          </p>
          <div className="flex items-center gap-1 py-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setNota(n)} aria-label={`${n} estrela(s)`} className="p-0.5">
                <Star className={cn("w-7 h-7", n <= nota ? "fill-primary text-primary" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <Textarea rows={3} placeholder="Conte como foi (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvaliando(null)}>Cancelar</Button>
            <Button onClick={enviarAvaliacao} disabled={enviandoAvaliacao}>{enviandoAvaliacao ? "Enviando..." : "Enviar avaliação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fichaEmpresa} onOpenChange={(o) => !o && setFichaEmpresa(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Ficha de anamnese{fichaEmpresa && ` — ${fichaEmpresa.nome}`}
            </DialogTitle>
          </DialogHeader>
          {fichaEmpresa && <AnamneseFicha companyId={fichaEmpresa.id} companyName={fichaEmpresa.nome} appointmentId={fichaEmpresa.appointmentId} serviceId={fichaEmpresa.serviceId} />}
        </DialogContent>
      </Dialog>

      {reagendando && (
        <ReagendarDialog
          open={!!reagendando}
          onOpenChange={(o) => !o && setReagendando(null)}
          appointmentId={reagendando.id}
          companyId={reagendando.company_id}
          // TODO(pós-migration 20260922000000_company_timezone): pedir
          // `companies(timezone)` de volta neste select assim que a coluna
          // existir em produção — hoje ela ainda não existe (PostgREST
          // recusa o select inteiro com "column does not exist" se ela for
          // pedida explicitamente), e 100% das empresas usam o mesmo fuso
          // de qualquer forma até a migration ser aplicada.
          companyTimezone={DEFAULT_TIMEZONE}
          professionalId={reagendando.professional_id}
          serviceId={reagendando.service_id}
          servicoNome={reagendando.services?.name ?? "Atendimento"}
          userId={userId}
        />
      )}
    </main>
  );
}
