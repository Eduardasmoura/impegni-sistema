"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarDays, Clock3, Users, Hourglass, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState, ErrorState } from "@/components/ui/query-state";
import { formatCurrency, formatDuration } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { zonedTimeToUtcIso } from "@/lib/timezone";
import { OccupancyCalendar, type DiaOcupacao } from "./occupancy-calendar";
import { ReagendarStaffDialog } from "./reagendar-staff-dialog";
import { AddToCalendarDialog } from "@/components/add-to-calendar";
import { AgendaDayHeader } from "./agenda-day-header";
import { AgendaTimeline, type BlockRow } from "./agenda-timeline";
import { AgendaFiltros, type AgendaFiltrosState } from "./agenda-filters";
import { AgendaAppointmentDialog } from "./agenda-appointment-dialog";
import type { Tables } from "@/lib/supabase/database.types";

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseHHMM(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

const DEFAULT_EXPEDIENTE_INICIO = 8 * 60;
const DEFAULT_EXPEDIENTE_FIM = 20 * 60;

const NOVO_VAZIO = { clientName: "", clientPhone: "", serviceId: "", professionalId: "", time: "09:00" };
const FILTROS_VAZIO: AgendaFiltrosState = { status: null, clientId: null, serviceId: null };

export function AgendaView({
  companyId,
  companyTimezone,
  currentUserId,
}: {
  companyId: string;
  companyTimezone: string;
  currentUserId: string | null;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();

  const hoje = useMemo(() => new Date(), []);
  const hojeStr = toDateStr(hoje);

  const [dia, setDia] = useState(hojeStr);
  const [viewYear, setViewYear] = useState(hoje.getFullYear());
  const [viewMonth, setViewMonth] = useState(hoje.getMonth());
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState(NOVO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  // Reagendamento (staff) — reaproveita a mesma RPC já usada pelo cliente
  // (reschedule_appointment), ver reagendar-staff-dialog.tsx.
  const [reagendando, setReagendando] = useState<Tables<"appointments"> | null>(null);
  // Detalhe do agendamento selecionado na timeline (substitui os ícones
  // soltos que existiam direto no card da lista antiga).
  const [detalhe, setDetalhe] = useState<Tables<"appointments"> | null>(null);
  const [calendarioId, setCalendarioId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<AgendaFiltrosState>(FILTROS_VAZIO);
  const [painelLateralAberto, setPainelLateralAberto] = useState(false);

  function mudarDia(novoDia: string) {
    setDia(novoDia);
    const [y, m] = novoDia.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  }

  const {
    data: appointments = [],
    isLoading: loadingAppointments,
    isError: errorAppointments,
  } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId).order("scheduled_at").limit(1000);
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: clients = [], isLoading: loadingClients, isError: errorClients } = useQuery({
    queryKey: ["clients", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"clients">[];
    },
  });
  const { data: services = [], isLoading: loadingServices, isError: errorServices } = useQuery({
    queryKey: ["services", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: professionals = [], isLoading: loadingProfessionals, isError: errorProfessionals } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  // Assim que a lista de profissionais carrega, seleciona automaticamente o
  // profissional ligado ao usuário logado (professionals.user_id) — quem
  // não tem um registro de profissional próprio (dono/gerente puro) cai no
  // primeiro da lista, e pode trocar pelo seletor.
  useEffect(() => {
    if (professionalId || professionals.length === 0) return;
    const proprio = currentUserId ? professionals.find((p) => p.user_id === currentUserId) : undefined;
    setProfessionalId(proprio?.id ?? professionals[0].id);
  }, [professionals, professionalId, currentUserId]);

  // Bloqueios/folgas/férias do profissional selecionado — mesma tabela já
  // usada em Agenda → Bloqueios (só leitura aqui, o CRUD continua lá).
  const { data: blocks = [] } = useQuery({
    queryKey: ["professional-blocks", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_blocks")
        .select("id, professional_id, starts_at, ends_at, reason, type")
        .eq("company_id", companyId);
      if (error) throw error;
      return data as (BlockRow & { professional_id: string })[];
    },
  });

  // Expediente por dia da semana — mesma tabela e mesma precedência que o
  // backend já usa (get_availability_day/month): professional_weekly_hours
  // quando existe, senão o legado professionals.start_time/end_time. Usado
  // só para desenhar a faixa de horas da timeline — não é uma regra nova de
  // disponibilidade, a regra de verdade continua só no backend.
  const { data: weeklyHours = [] } = useQuery({
    queryKey: ["weekly-hours", professionalId],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_weekly_hours")
        .select("weekday, active, start_time, end_time")
        .eq("professional_id", professionalId!);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingAppointments || loadingClients || loadingServices || loadingProfessionals;
  const isError = errorAppointments || errorClients || errorServices || errorProfessionals;

  // Agenda do dia — sempre do profissional selecionado no calendário (a
  // ocupação mostrada acima é dele; a timeline abaixo tem que bater com ela).
  const doDiaSemFiltro = useMemo(
    () =>
      appointments
        .filter((a) => a.professional_id === professionalId && toDateStr(new Date(a.scheduled_at)) === dia)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()),
    [appointments, dia, professionalId]
  );

  // Filtros de Status/Cliente/Serviço — só reduzem o que já está na tela,
  // não mudam nenhuma consulta nem regra de negócio.
  const doDia = useMemo(
    () =>
      doDiaSemFiltro.filter(
        (a) =>
          (!filtros.status || a.status === filtros.status) &&
          (!filtros.clientId || a.client_id === filtros.clientId) &&
          (!filtros.serviceId || a.service_id === filtros.serviceId)
      ),
    [doDiaSemFiltro, filtros]
  );

  const blocksDoDia = useMemo(
    () => blocks.filter((b) => b.professional_id === professionalId && toDateStr(new Date(b.starts_at)) <= dia && toDateStr(new Date(b.ends_at)) >= dia),
    [blocks, dia, professionalId]
  );

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const clientesDoDia = useMemo(() => {
    const vistos = new Map<string, string>();
    for (const a of doDiaSemFiltro) if (!vistos.has(a.client_id)) vistos.set(a.client_id, clientNameById.get(a.client_id) || "Cliente");
    return [...vistos.entries()].map(([id, name]) => ({ id, name }));
  }, [doDiaSemFiltro, clientNameById]);
  const servicosDoDia = useMemo(() => {
    const vistos = new Map<string, Tables<"services">>();
    for (const a of doDiaSemFiltro) {
      const s = serviceById.get(a.service_id);
      if (s && !vistos.has(s.id)) vistos.set(s.id, s);
    }
    return [...vistos.values()];
  }, [doDiaSemFiltro, serviceById]);

  // Faixa de horas exibida na timeline — ver comentário da query acima.
  const { expedienteInicioMin, expedienteFimMin } = useMemo(() => {
    const weekday = new Date(`${dia}T00:00:00`).getDay();
    const linha = weeklyHours.find((w) => w.weekday === weekday);
    const profissional = professionals.find((p) => p.id === professionalId);
    if (linha) {
      if (linha.active && linha.start_time && linha.end_time) {
        return { expedienteInicioMin: parseHHMM(linha.start_time)!, expedienteFimMin: parseHHMM(linha.end_time)! };
      }
      return { expedienteInicioMin: DEFAULT_EXPEDIENTE_INICIO, expedienteFimMin: DEFAULT_EXPEDIENTE_FIM };
    }
    const legIni = parseHHMM(profissional?.start_time);
    const legFim = parseHHMM(profissional?.end_time);
    return {
      expedienteInicioMin: legIni ?? DEFAULT_EXPEDIENTE_INICIO,
      expedienteFimMin: legFim ?? DEFAULT_EXPEDIENTE_FIM,
    };
  }, [dia, weeklyHours, professionals, professionalId]);

  // Ocupação do MÊS visível — capacidade real (expediente menos bloqueios)
  // e tempo efetivamente ocupado (agendamentos não cancelados), numa única
  // consulta no banco (sem N+1). Reaproveitada tanto pro mini calendário
  // quanto pro resumo do dia selecionado (capacidade/disponibilidade).
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const { data: monthRows = [], isFetching: carregandoMes } = useQuery({
    queryKey: ["occupancy-month", companyId, professionalId, monthKey],
    enabled: !!professionalId,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_professional_occupancy_month", {
        p_company_id: companyId,
        p_professional_id: professionalId!,
        p_month: monthKey,
      });
      if (error) throw error;
      return rows ?? [];
    },
  });
  const occupancyByDay = useMemo(() => {
    const map = new Map<string, DiaOcupacao>();
    for (const r of monthRows) {
      map.set(r.day, { capacityMin: r.capacity_min, occupiedMin: r.occupied_min, appointmentCount: r.appointment_count, occupancyPct: Number(r.occupancy_pct) });
    }
    return map;
  }, [monthRows]);

  // Resumo do dia selecionado — atendimentos e tempo ocupado vêm da própria
  // lista já filtrada (sempre em sincronia com o que é exibido, sem
  // considerar os filtros de status/cliente/serviço — o resumo é do dia
  // inteiro); capacidade (pra calcular "disponível") vem da ocupação
  // mensal, quando o dia selecionado está dentro do mês carregado.
  const resumoDia = useMemo(() => {
    const ocupadoMin = doDiaSemFiltro.filter((a) => a.status !== "canceled").reduce((soma, a) => soma + (a.duration_min || 0), 0);
    const capacidadeMin = occupancyByDay.get(dia)?.capacityMin ?? null;
    const disponivelMin = capacidadeMin !== null ? Math.max(0, capacidadeMin - ocupadoMin) : null;
    return { atendimentos: doDiaSemFiltro.filter((a) => a.status !== "canceled").length, ocupadoMin, capacidadeMin, disponivelMin };
  }, [doDiaSemFiltro, occupancyByDay, dia]);

  const diaEhPassado = dia < hojeStr;

  async function mudarStatus(appointment: Tables<"appointments">, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
    if (error) {
      toast({ title: "Erro", description: friendlyError(error, "atualizar o status do agendamento"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["appointments", companyId] });
    qc.invalidateQueries({ queryKey: ["occupancy-month", companyId] });
    setDetalhe(null);
  }

  function abrirNovoAgendamento() {
    setNovo({ ...NOVO_VAZIO, professionalId: professionalId ?? "" });
    setOpen(true);
  }

  // Deep link "Novo agendamento" a partir do atalho de Ações rápidas do
  // Dashboard (/agenda?novo=1) — mesmo padrão já usado em
  // /servicos?onboarding=1 e /equipe?onboarding=1. Não abre em dia passado
  // (mesma regra que já desabilita o botão "Novo agendamento" na tela).
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("novo") === "1" && !diaEhPassado) abrirNovoAgendamento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function criarAgendamento() {
    if (diaEhPassado) return; // dias passados não recebem novos agendamentos
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

      const scheduledAt = zonedTimeToUtcIso(dia, novo.time, companyTimezone);
      const { data: criado, error: appointmentError } = await supabase.from("appointments").insert({
        company_id: companyId,
        client_id: clientId,
        professional_id: novo.professionalId,
        service_id: novo.serviceId,
        scheduled_at: scheduledAt,
        duration_min: servico.duration_min,
        price: servico.price,
        origin: "staff",
      }).select("id").single();
      if (appointmentError) throw appointmentError;

      qc.invalidateQueries({ queryKey: ["appointments", companyId] });
      qc.invalidateQueries({ queryKey: ["clients", companyId] });
      qc.invalidateQueries({ queryKey: ["occupancy-month", companyId] });
      toast({
        title: "Agendamento criado",
        action: criado ? (
          <Button size="sm" variant="outline" onClick={() => setCalendarioId(criado.id)}>Adicionar à agenda</Button>
        ) : undefined,
      });
      setOpen(false);
      setNovo(NOVO_VAZIO);
    } catch (e) {
      toast({ title: "Erro ao agendar", description: friendlyError(e, "criar o agendamento"), variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  }

  const profissionalAtual = professionals.find((p) => p.id === professionalId);

  const painelLateral = (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <OccupancyCalendar
            year={viewYear}
            month={viewMonth}
            onMonthChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
            occupancyByDay={occupancyByDay}
            loading={carregandoMes}
            selectedDate={dia}
            onSelectDate={(d) => { mudarDia(d); setPainelLateralAberto(false); }}
          />
        </CardContent>
      </Card>

      {professionals.length > 1 && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Profissional</label>
          <Select value={professionalId ?? undefined} onValueChange={(v) => setProfessionalId(v)}>
            <SelectTrigger aria-label="Filtrar por profissional" className="h-9 text-sm"><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <AgendaFiltros filtros={filtros} onChange={setFiltros} clientesDoDia={clientesDoDia} servicosDoDia={servicosDoDia} />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground truncate">
            {resumoDia.atendimentos} atendimento(s) no dia{profissionalAtual ? ` · ${profissionalAtual.name}` : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0" onClick={abrirNovoAgendamento} disabled={diaEhPassado} title={diaEhPassado ? "Não é possível criar agendamentos em dias passados" : undefined}>
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo agendamento</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo agendamento — {dia}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome do cliente</Label><Input value={novo.clientName} onChange={(e) => setNovo({ ...novo, clientName: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input type="tel" value={novo.clientPhone} onChange={(e) => setNovo({ ...novo, clientPhone: e.target.value })} /></div>
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

      {isLoading ? (
        <LoadingState text="Carregando agenda..." />
      ) : isError ? (
        <ErrorState message="Não foi possível carregar a agenda." />
      ) : (
        <div className="lg:flex lg:items-start lg:gap-6">
          {/* Painel lateral — calendário + filtros. Fixo no desktop; atrás de
              um botão "Filtros e calendário" em telas menores, pra timeline
              ser o elemento principal também no mobile/tablet. */}
          <div className="hidden lg:block lg:w-[280px] shrink-0">{painelLateral}</div>

          <div className="lg:hidden mb-4">
            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => setPainelLateralAberto((v) => !v)}>
              {painelLateralAberto ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
              {painelLateralAberto ? "Fechar" : "Calendário e filtros"}
            </Button>
            {painelLateralAberto && <div className="mt-3">{painelLateral}</div>}
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 lg:sticky lg:top-0 lg:z-20 lg:bg-background lg:py-1">
              <AgendaDayHeader dia={dia} hojeStr={hojeStr} onChangeDia={mudarDia} />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <ResumoCard icon={Users} label="Atendimentos" valor={String(resumoDia.atendimentos)} />
              <ResumoCard icon={Clock3} label="Ocupado" valor={formatDuration(resumoDia.ocupadoMin)} />
              <ResumoCard icon={Hourglass} label="Disponível" valor={resumoDia.disponivelMin !== null ? formatDuration(resumoDia.disponivelMin) : "—"} />
            </div>

            {doDiaSemFiltro.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  Nenhum agendamento neste dia.
                </CardContent>
              </Card>
            ) : (
              <>
                {doDia.length === 0 && (
                  <p className="text-sm text-muted-foreground px-1">Nenhum agendamento com os filtros atuais.</p>
                )}
                <AgendaTimeline
                  dia={dia}
                  ehHoje={dia === hojeStr}
                  expedienteInicioMin={expedienteInicioMin}
                  expedienteFimMin={expedienteFimMin}
                  appointments={doDia}
                  blocks={blocksDoDia}
                  clientNameById={clientNameById}
                  serviceById={serviceById}
                  onSelectAppointment={setDetalhe}
                />
              </>
            )}
          </div>
        </div>
      )}

      {calendarioId && (
        <AddToCalendarDialog open onOpenChange={(o) => !o && setCalendarioId(null)} appointmentId={calendarioId} audience="professional" />
      )}

      {detalhe && (
        <AgendaAppointmentDialog
          appointment={detalhe}
          clientName={clientNameById.get(detalhe.client_id) || "Cliente"}
          service={serviceById.get(detalhe.service_id)}
          professionalName={professionals.find((p) => p.id === detalhe.professional_id)?.name}
          onOpenChange={(o) => !o && setDetalhe(null)}
          onMudarStatus={mudarStatus}
          onReagendar={(a) => { setDetalhe(null); setReagendando(a); }}
        />
      )}

      {reagendando && (
        <ReagendarStaffDialog
          open={!!reagendando}
          onOpenChange={(o) => !o && setReagendando(null)}
          appointmentId={reagendando.id}
          companyId={companyId}
          companyTimezone={companyTimezone}
          professionalId={reagendando.professional_id}
          serviceId={reagendando.service_id}
          servicoNome={services.find((s) => s.id === reagendando.service_id)?.name ?? "Atendimento"}
          clienteNome={clients.find((c) => c.id === reagendando.client_id)?.name ?? "Cliente"}
          onReagendado={() => setReagendando(null)}
        />
      )}
    </div>
  );
}

function ResumoCard({ icon: Icon, label, valor }: { icon: typeof Clock3; label: string; valor: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-heading font-semibold leading-tight truncate">{valor}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
