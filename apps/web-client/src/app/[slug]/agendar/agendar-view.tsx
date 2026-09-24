"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Phone, Calendar as CalIcon, Check, ChevronLeft, LogIn, UserPlus, Tag, X as XIcon, ListPlus, ExternalLink } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { zonedTimeToUtcIso, DEFAULT_TIMEZONE } from "@/lib/timezone";
import { AvailabilityCalendar } from "./availability-calendar";
import type { Tables } from "@/lib/supabase/database.types";
import { AddToCalendarButton } from "@/components/add-to-calendar";
import type { PublicCompany } from "@/lib/public-company";
import { CaucaoBox } from "./caucao-box";

// Ordem pedida: profissional -> serviço -> calendário/horário -> confirmação.
const STEPS = ["Profissional", "Serviço", "Horário", "Confirmação"];
const METODOS = [
  { chave: "pix", label: "Pix" },
  { chave: "card", label: "Cartão" },
  { chave: "cash", label: "Dinheiro" },
  { chave: "online", label: "Pagar online" },
];

// Traduz os erros conhecidos que o banco pode devolver na hora de confirmar
// (conflito de horário, bloqueio, fora do expediente) pra uma mensagem que
// faz sentido pro cliente — o resto (erro genérico) cai na mensagem padrão.
function mensagemDeErro(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (raw.includes("exclusion constraint") || raw.includes("appointments_no_overlap")) {
    return "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.";
  }
  if (raw.includes("blocked")) {
    return "O profissional não está disponível nesse horário.";
  }
  if (raw.includes("working hours")) {
    return "Esse horário está fora do expediente do profissional.";
  }
  return raw;
}

export function AgendarView({ company }: { company: PublicCompany }) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseUser();
  const supabase = createClient();
  // Serviço vindo do clique num card na página pública (/[slug]?service=id
  // ...agendar?service=id) — já pré-seleciona o serviço, mas o fluxo novo
  // ainda exige escolher o profissional primeiro (etapa 0).
  const serviceFromUrl = searchParams.get("service");

  const storageKey = `agendar:${company.id}`;
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [metodo, setMetodo] = useState("pix");
  const [loading, setLoading] = useState(false);
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState<{ code: string; discount_amount: number; final_amount: number } | null>(null);
  const [aplicandoCupom, setAplicandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState("");
  const [entrandoNaFila, setEntrandoNaFila] = useState(false);
  const [naFilaDeEspera, setNaFilaDeEspera] = useState(false);
  const [cpfCliente, setCpfCliente] = useState("");
  const [caucaoDeclarado, setCaucaoDeclarado] = useState(false);
  const [pagamentoOnline, setPagamentoOnline] = useState<{ invoiceUrl: string; appointmentId?: string } | null>(null);

  const agora = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(agora.getFullYear());
  const [viewMonth, setViewMonth] = useState(agora.getMonth());

  // Recupera a seleção em andamento (profissional/serviço/data/hora) — sem
  // isso, um usuário que precisa logar/cadastrar no meio do fluxo (etapa 3)
  // perdia tudo ao voltar, porque o login navega pra outra página e
  // remonta este componente do zero.
  useEffect(() => {
    // Clicou num serviço específico (card da página pública) — é uma nova
    // intenção, então essa tem prioridade sobre qualquer rascunho antigo em
    // andamento; ainda assim precisa escolher o profissional (etapa 0).
    if (serviceFromUrl) {
      setServiceId(serviceFromUrl);
      setStep(0);
      return;
    }
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{ step: number; serviceId: string; professionalId: string | null; data: string; hora: string }>;
      if (saved.serviceId) setServiceId(saved.serviceId);
      if (saved.professionalId !== undefined) setProfessionalId(saved.professionalId);
      if (saved.data) setData(saved.data);
      if (saved.hora) setHora(saved.hora);
      if (typeof saved.step === "number") setStep(saved.step);
    } catch {
      // sessionStorage indisponível (modo privado etc.) — segue sem restaurar.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ step, serviceId, professionalId, data, hora }));
    } catch {
      // idem — falha silenciosa, não é crítico.
    }
  }, [storageKey, step, serviceId, professionalId, data, hora]);

  const { data: services = [] } = useQuery({
    queryKey: ["public-services", company.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("company_id", company.id).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"services">[];
    },
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["public-professionals", company.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", company.id).eq("active", true).order("name");
      if (error) throw error;
      return data as Tables<"professionals">[];
    },
  });

  const servico = services.find((s) => s.id === serviceId);
  const professional = professionals.find((p) => p.id === professionalId);

  // Se o id vindo da URL não corresponder a nenhum serviço ativo da empresa
  // (link velho/inválido), volta pra etapa de escolha em vez de travar num
  // estado inconsistente.
  useEffect(() => {
    if (serviceFromUrl && services.length > 0 && !services.some((s) => s.id === serviceFromUrl)) {
      setServiceId(null);
      setStep(0);
    }
  }, [serviceFromUrl, services]);

  // Volta o calendário pro mês atual sempre que profissional ou serviço
  // mudam — evita mostrar o mês de julho pro profissional novo só porque o
  // usuário tinha navegado pra lá com o profissional anterior.
  useEffect(() => {
    setViewYear(agora.getFullYear());
    setViewMonth(agora.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, serviceId]);

  // Disponibilidade do MÊS visível — contagem real por dia (expediente do
  // profissional menos agendamentos/bloqueios existentes), calculada no
  // banco via get_availability_month (reaproveita as mesmas regras das
  // triggers de agendamento). Nunca é uma contagem feita no front.
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const { data: monthRows = [], isFetching: carregandoMes } = useQuery({
    queryKey: ["availability-month", company.id, professionalId, serviceId, monthKey],
    enabled: !!professionalId && !!serviceId,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_availability_month", {
        p_company_id: company.id,
        p_professional_id: professionalId!,
        p_service_id: serviceId!,
        p_month: monthKey,
      });
      if (error) throw error;
      return rows ?? [];
    },
  });
  const countsByDay = useMemo(() => new Map(monthRows.map((r) => [r.day, r.available_count])), [monthRows]);

  // Horários do DIA selecionado — recalculados no banco no momento do
  // clique (nunca reaproveita a contagem do mês), já excluindo horários
  // ocupados/bloqueados/fora de expediente/passados.
  const { data: horariosDoDia = [], isFetching: carregandoHorarios } = useQuery({
    queryKey: ["availability-day", company.id, professionalId, serviceId, data],
    enabled: !!professionalId && !!serviceId && !!data,
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_availability_day", {
        p_company_id: company.id,
        p_professional_id: professionalId!,
        p_service_id: serviceId!,
        p_day: data,
      });
      if (error) throw error;
      return (rows ?? []).map((r) => r.slot_time.slice(0, 5));
    },
  });

  const termino = useMemo(() => {
    if (!hora || !servico) return null;
    const inicio = new Date(`${data}T${hora}:00`);
    return new Date(inicio.getTime() + servico.duration_min * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [hora, data, servico]);

  async function aplicarCupom() {
    if (!cupomCodigo.trim() || !servico || !user) return;
    setAplicandoCupom(true);
    setErroCupom("");
    // p_client_id vai vazio de propósito: quem ainda não tem cadastro nesta
    // empresa (1ª vez agendando aqui) também precisa poder ver o desconto.
    // O limite por cliente é aplicado de verdade em book_appointment, com o
    // client_id real, no momento da confirmação.
    const { data, error } = await supabase.rpc("preview_coupon", {
      p_company_id: company.id,
      p_code: cupomCodigo.trim(),
      p_service_id: serviceId!,
      p_professional_id: professionalId!,
    });
    setAplicandoCupom(false);
    // preview_coupon não lança mais exceção pra "cupom inválido" — devolve
    // sempre uma linha com valid/reason; só error de verdade é falha de uso
    // da API (sem login, serviço inexistente).
    if (error || !data?.[0]) {
      setErroCupom(mensagemDeErro(error));
      setCupomAplicado(null);
      return;
    }
    const resultado = data[0];
    if (!resultado.valid) {
      setErroCupom(resultado.reason || "Cupom inválido");
      setCupomAplicado(null);
      return;
    }
    setCupomAplicado({ code: cupomCodigo.trim(), discount_amount: Number(resultado.discount_amount), final_amount: Number(resultado.final_amount) });
  }

  // Dados que o cliente logado já tem: primeiro o cadastro dele NESTA empresa
  // (clients, filtrado por company_id), depois o perfil da própria conta
  // (profiles, preenchido no cadastro/“Meu perfil”). Cadastro de outra
  // empresa nunca é consultado. Só o que faltar nos dois é perguntado.
  const { data: clienteExistente, isLoading: carregandoCliente } = useQuery({
    queryKey: ["client-lookup", company.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, phone").eq("company_id", company.id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });
  const { data: perfil, isLoading: carregandoPerfil } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const carregandoDados = !!user && (carregandoCliente || carregandoPerfil);

  // Caução (pago direto ao estabelecimento). Só vem configuração se ESTA
  // empresa cobra caução; o valor já chega calculado pelo servidor sobre o
  // preço do serviço. Sem caução, o fluxo segue exatamente como antes.
  const { data: caucao, isLoading: carregandoCaucao } = useQuery({
    queryKey: ["booking-deposit", company.id, serviceId, user?.id],
    enabled: !!user && !!serviceId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_deposit", { p_company_id: company.id, p_service_id: serviceId! });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const aguardandoCaucao = !!user && !!serviceId && carregandoCaucao;
  // A declaração vale só para o horário/serviço escolhido agora.
  useEffect(() => {
    setCaucaoDeclarado(false);
  }, [serviceId, professionalId, data, hora]);
  const nomeCadastrado = clienteExistente?.name?.trim() || perfil?.full_name?.trim() || "";
  const telefoneCadastrado = clienteExistente?.phone?.trim() || perfil?.phone?.trim() || "";
  const nomeFinal = nomeCadastrado || nome.trim();
  const telefoneFinal = telefoneCadastrado || telefone.trim();

  // Garante o registro `clients` desta empresa (unique(company_id, user_id))
  // e grava o que o cliente acabou de informar no perfil da conta. Nunca
  // sobrescreve um valor existente — só preenche o que estava vazio.
  async function obterClienteId(): Promise<string> {
    if (!user) throw new Error("Faça login para continuar.");
    if (!nomeFinal || !telefoneFinal) throw new Error("Informe seu nome e telefone.");

    const perfilPatch: { full_name?: string; phone?: string } = {};
    if (!perfil?.full_name?.trim()) perfilPatch.full_name = nomeFinal;
    if (!perfil?.phone?.trim()) perfilPatch.phone = telefoneFinal;
    if (perfil && Object.keys(perfilPatch).length) {
      const { error } = await supabase.from("profiles").update(perfilPatch).eq("id", user.id);
      if (error) throw error;
    }

    const { data: clientRow } = await supabase.from("clients").select("id, name, phone").eq("company_id", company.id).eq("user_id", user.id).maybeSingle();
    if (!clientRow) {
      const { data: novoCliente, error: clientError } = await supabase
        .from("clients")
        .insert({ company_id: company.id, user_id: user.id, name: nomeFinal, phone: telefoneFinal })
        .select("id")
        .single();
      if (clientError) throw clientError;
      return novoCliente.id;
    }
    const clientePatch: { name?: string; phone?: string } = {};
    if (!clientRow.name?.trim()) clientePatch.name = nomeFinal;
    if (!clientRow.phone?.trim()) clientePatch.phone = telefoneFinal;
    if (Object.keys(clientePatch).length) {
      const { error } = await supabase.from("clients").update(clientePatch).eq("id", clientRow.id);
      if (error) throw error;
    }
    return clientRow.id;
  }

  async function entrarNaListaDeEspera() {
    if (!user || !serviceId) return;
    if (!nomeFinal || !telefoneFinal) return;
    setEntrandoNaFila(true);
    try {
      const clientId = await obterClienteId();
      const { error } = await supabase.from("waitlist_entries").insert({
        company_id: company.id,
        client_id: clientId,
        service_id: serviceId,
        professional_id: professionalId,
        preferred_date: data || null,
        status: "waiting",
      });
      if (error) throw error;
      setNaFilaDeEspera(true);
      toast({ title: "Você entrou na lista de espera!", description: "Avisamos assim que uma vaga abrir nesse dia." });
    } catch (e) {
      toast({ title: "Erro ao entrar na lista de espera", description: mensagemDeErro(e), variant: "destructive" });
    } finally {
      setEntrandoNaFila(false);
    }
  }

  async function confirmar() {
    if (!servico || !user) return;
    setLoading(true);
    try {
      const clientId = await obterClienteId();

      const scheduledAt = zonedTimeToUtcIso(data, hora, company.timezone ?? DEFAULT_TIMEZONE);
      // Agendamento + pagamento numa RPC só (transação atômica) — antes eram
      // dois inserts separados e o segundo (payments) sempre falhava por RLS
      // pra um cliente comum, deixando o agendamento órfão sem pagamento.
      const agendamento = {
        p_company_id: company.id,
        p_client_id: clientId,
        p_professional_id: professionalId!,
        p_service_id: serviceId!,
        p_scheduled_at: scheduledAt,
        p_payment_method: metodo,
        p_coupon_code: cupomAplicado?.code || undefined,
      };
      // Com caução: mesma reserva (book_appointment é chamado lá dentro, com
      // preço/duplo agendamento no servidor) + registro de que o cliente
      // informou o pagamento, na mesma transação.
      const { data: bookData, error: bookError } = caucao
        ? await supabase.rpc("book_appointment_with_deposit", { ...agendamento, p_deposit_reported: caucaoDeclarado })
        : await supabase.rpc("book_appointment", agendamento);
      if (bookError) throw bookError;
      const desconto = Number(bookData?.[0]?.discount_amount || 0);
      const paymentId = bookData?.[0]?.payment_id as string | undefined;
      const appointmentId = bookData?.[0]?.appointment_id as string | undefined;
      // a tela de "Meus agendamentos" abre a confirmação com "Adicionar à minha agenda"
      const destino = appointmentId ? `/meus-agendamentos?agendado=${appointmentId}` : "/meus-agendamentos";

      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // não crítico
      }

      // Pagamento online: o agendamento já foi confirmado (payment fica
      // "pending" até o Asaas avisar via webhook) — aqui só criamos a
      // cobrança e mostramos o link de pagamento, sem sair da tela ainda.
      if (metodo === "online" && paymentId) {
        const { data: chargeData, error: chargeError } = await supabase.functions.invoke("create-appointment-charge", {
          body: { payment_id: paymentId, cpf_cnpj: cpfCliente || undefined },
        });
        if (chargeError) {
          const context = (chargeError as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          const body = await context?.json?.().catch(() => null);
          toast({
            title: "Agendamento confirmado, mas a cobrança online falhou",
            description: `${body?.error || chargeError.message} — combine o pagamento direto com o estabelecimento.`,
            variant: "destructive",
          });
          router.push(destino);
          return;
        }
        setPagamentoOnline({ invoiceUrl: chargeData.invoice_url, appointmentId });
        return;
      }

      toast({
        title: "Agendamento confirmado!",
        description: desconto > 0
          ? `${servico.name} em ${new Date(scheduledAt).toLocaleString("pt-BR")} — cupom aplicado, você economizou ${formatCurrency(desconto)}`
          : `${servico.name} em ${new Date(scheduledAt).toLocaleString("pt-BR")}`,
      });
      router.push(destino);
    } catch (e) {
      toast({ title: "Erro ao agendar", description: mensagemDeErro(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-1">Agendar em {company.name}</h1>
        <p className="text-muted-foreground text-sm mb-6">Escolha o profissional, o serviço e o horário.</p>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={cn("flex items-center gap-2", i <= step ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border", i < step ? "bg-primary text-primary-foreground border-primary" : i === step ? "border-primary" : "border-border")}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-xs hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {professionals.map((p) => (
              <button
                key={p.id}
                onClick={() => { setProfessionalId(p.id); setData(""); setHora(""); setStep(serviceId ? 2 : 1); }}
                className="text-left"
              >
                <Card className={cn("overflow-hidden hover:shadow-md transition-shadow h-full", professionalId === p.id && "ring-2 ring-primary")}>
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden text-2xl text-muted-foreground">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      p.name?.[0]
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="font-medium text-sm text-center">{p.name}</p>
                    <p className="text-xs text-muted-foreground text-center capitalize">{p.role_title}</p>
                  </CardContent>
                </Card>
              </button>
            ))}
            {professionals.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhum profissional disponível no momento.</p>}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {services.map((s) => (
                <button key={s.id} onClick={() => { setServiceId(s.id); setData(""); setHora(""); setStep(2); }} className="text-left">
                  <Card className={cn("hover:shadow-md transition-shadow h-full", serviceId === s.id && "ring-2 ring-primary")}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5"><Clock className="w-3 h-3" />{s.duration_min} min</div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="font-semibold text-primary text-sm mt-1">{formatCurrency(Number(s.price))}</p>
                    </CardContent>
                  </Card>
                </button>
              ))}
              {services.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhum serviço disponível no momento.</p>}
            </div>
            <BackBtn onClick={() => setStep(0)} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Escolha o dia</label>
                <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                  <AvailabilityCalendar
                    year={viewYear}
                    month={viewMonth}
                    onMonthChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
                    countsByDay={countsByDay}
                    loading={carregandoMes}
                    selectedDate={data || null}
                    onSelectDate={(d) => { setData(d); setHora(""); setNaFilaDeEspera(false); }}
                  />
                </div>
              </div>

              {data && (
                <div>
                  <label className="text-sm font-medium">Horários disponíveis</label>
                  {carregandoHorarios ? (
                    <p className="text-sm text-muted-foreground mt-2">Carregando horários...</p>
                  ) : horariosDoDia.length === 0 ? (
                    <div className="mt-2 space-y-3">
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível neste dia.</p>
                      <div className="rounded-xl border border-dashed border-primary/40 p-3">
                        {naFilaDeEspera ? (
                          <p className="text-sm text-primary flex items-center gap-1.5"><Check className="w-4 h-4 shrink-0" /> Você está na lista de espera pra esse dia — avisamos se abrir vaga.</p>
                        ) : !user ? (
                          <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">Quer entrar na lista de espera pra esse dia?</p>
                            <Link href={`/login?returnTo=/${company.slug}/agendar`}>
                              <Button size="sm" variant="outline" className="gap-1.5"><LogIn className="w-3.5 h-3.5" /> Entrar pra participar</Button>
                            </Link>
                          </div>
                        ) : !carregandoDados && (!nomeCadastrado || !telefoneCadastrado) ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Seus dados pra entrar na lista de espera:</p>
                            {!nomeCadastrado && <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />}
                            {!telefoneCadastrado && <input type="tel" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />}
                            <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={entrarNaListaDeEspera} disabled={entrandoNaFila || !nomeFinal || !telefoneFinal}>
                              <ListPlus className="w-3.5 h-3.5" /> {entrandoNaFila ? "Entrando..." : "Entrar na lista de espera"}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={entrarNaListaDeEspera} disabled={entrandoNaFila || carregandoDados}>
                            <ListPlus className="w-3.5 h-3.5" /> {entrandoNaFila ? "Entrando..." : "Entrar na lista de espera pra esse dia"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {horariosDoDia.map((h) => (
                        <button
                          key={h}
                          onClick={() => setHora(h)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm border transition-colors",
                            hora === h ? "bg-primary text-primary-foreground border-primary" : "border-primary/40 text-primary hover:bg-primary/10"
                          )}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between mt-6">
              <BackBtn onClick={() => setStep(1)} />
              <Button disabled={!hora || !data} onClick={() => setStep(3)} className="gap-2">Continuar</Button>
            </div>
          </>
        )}

        {pagamentoOnline && (
          <Card className="overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">Agendamento confirmado!</h3>
                <p className="text-sm text-muted-foreground mt-1">Falta só o pagamento — escolha Pix, boleto ou cartão na página segura do Asaas.</p>
              </div>
              <a href={pagamentoOnline.invoiceUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full gap-2"><ExternalLink className="w-4 h-4" /> Pagar agora</Button>
              </a>
              {pagamentoOnline.appointmentId && (
                <AddToCalendarButton appointmentId={pagamentoOnline.appointmentId} audience="client" className="w-full gap-1.5" size="default" />
              )}
              <Button variant="outline" className="w-full" onClick={() => router.push(pagamentoOnline.appointmentId ? `/meus-agendamentos?agendado=${pagamentoOnline.appointmentId}` : "/meus-agendamentos")}>Pagar depois — ver meus agendamentos</Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && servico && !pagamentoOnline && (
          <>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="font-heading text-lg font-semibold">{servico.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><User className="w-3.5 h-3.5" />{professional?.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><CalIcon className="w-3.5 h-3.5" />{new Date(`${data}T${hora}`).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Clock className="w-3.5 h-3.5" />{hora} — {termino}</p>
              </div>
              <div className="border-t border-border p-4 space-y-3">
                {user ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">Logado como <strong>{user.email}</strong></span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center space-y-3">
                    <div>
                      <p className="font-medium text-sm">Faça login ou cadastre-se para confirmar</p>
                      <p className="text-xs text-muted-foreground mt-1">Você precisa de uma conta para finalizar o agendamento.</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/login?returnTo=/${company.slug}/agendar`} className="flex-1">
                        <Button variant="outline" className="w-full gap-1.5"><LogIn className="w-4 h-4" /> Entrar</Button>
                      </Link>
                      <Link href={`/register?returnTo=/${company.slug}/agendar`} className="flex-1">
                        <Button className="w-full gap-1.5"><UserPlus className="w-4 h-4" /> Cadastrar</Button>
                      </Link>
                    </div>
                  </div>
                )}
                {user && (
                  <div>
                    <label htmlFor="cupom" className="text-xs font-medium text-muted-foreground">Cupom de desconto</label>
                    {cupomAplicado ? (
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-primary"><Tag className="w-3.5 h-3.5" /> {cupomAplicado.code}</span>
                        <button onClick={() => { setCupomAplicado(null); setCupomCodigo(""); }} aria-label="Remover cupom" className="text-muted-foreground hover:text-destructive">
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        <Input id="cupom" value={cupomCodigo} onChange={(e) => { setCupomCodigo(e.target.value.toUpperCase()); setErroCupom(""); }} placeholder="Ex: VERAO10" className="flex-1" />
                        <Button type="button" variant="outline" onClick={aplicarCupom} disabled={!cupomCodigo.trim() || aplicandoCupom}>
                          {aplicandoCupom ? "Validando..." : "Aplicar"}
                        </Button>
                      </div>
                    )}
                    {erroCupom && <p className="text-xs text-destructive mt-1">{erroCupom}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  {cupomAplicado && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Valor original</span>
                        <span>{formatCurrency(Number(servico.price))}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-primary">
                        <span>Desconto ({cupomAplicado.code})</span>
                        <span>− {formatCurrency(cupomAplicado.discount_amount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-heading text-2xl font-bold text-primary">{formatCurrency(cupomAplicado ? cupomAplicado.final_amount : Number(servico.price))}</span>
                  </div>
                </div>
                {user && (
                  <>
                    {carregandoDados ? (
                      <p className="text-xs text-muted-foreground">Carregando seus dados...</p>
                    ) : (
                      <>
                        {(nomeCadastrado || telefoneCadastrado) && (
                          <div data-testid="seus-dados" className="rounded-lg border border-border px-3 py-2 text-sm space-y-0.5">
                            <p className="text-xs font-medium text-muted-foreground">Seus dados</p>
                            {nomeCadastrado && <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="truncate">{nomeCadastrado}</span></p>}
                            {telefoneCadastrado && <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5 shrink-0" />{telefoneCadastrado}</p>}
                          </div>
                        )}
                        {!nomeCadastrado && (
                          <div>
                            <label htmlFor="nome-cliente" className="text-xs font-medium text-muted-foreground">Seu nome *</label>
                            <input
                              id="nome-cliente"
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              placeholder="Seu nome"
                              required
                              className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                        {!telefoneCadastrado && (
                          <div>
                            <label htmlFor="telefone-cliente" className="text-xs font-medium text-muted-foreground">Telefone / WhatsApp *</label>
                            <input
                              id="telefone-cliente"
                              type="tel"
                              inputMode="tel"
                              value={telefone}
                              onChange={(e) => setTelefone(e.target.value)}
                              placeholder="(11) 99999-9999"
                              required
                              className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <label className="text-sm font-medium">Forma de pagamento</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                        {METODOS.map((m) => (
                          <button
                            key={m.chave}
                            onClick={() => setMetodo(m.chave)}
                            className={cn("py-3 rounded-lg border text-xs", metodo === m.chave ? "bg-primary text-primary-foreground border-primary" : "border-border")}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {metodo === "online" && (
                        <div className="mt-2">
                          <label htmlFor="cpf-cliente" className="text-xs font-medium text-muted-foreground">CPF (necessário pra gerar a cobrança) *</label>
                          <input
                            id="cpf-cliente"
                            inputMode="numeric"
                            value={cpfCliente}
                            onChange={(e) => setCpfCliente(e.target.value)}
                            placeholder="000.000.000-00"
                            required
                            className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">Você vai escolher Pix, boleto ou cartão na página de pagamento, no próximo passo.</p>
                        </div>
                      )}
                    </div>
                    {caucao && servico && (
                      <CaucaoBox caucao={caucao} servicoNome={servico.name} declarado={caucaoDeclarado} onDeclaradoChange={setCaucaoDeclarado} />
                    )}
                  </>
                )}
              </div>
            </Card>
            <div className="flex justify-between mt-6">
              <BackBtn onClick={() => setStep(2)} />
              {user && (
                <Button disabled={carregandoDados || aguardandoCaucao || (!!caucao && !caucaoDeclarado) || !nomeFinal || !telefoneFinal || loading || (metodo === "online" && !cpfCliente.trim())} onClick={confirmar} className="gap-2">
                  {loading ? "Confirmando..." : <><Check className="w-4 h-4" /> Confirmar agendamento</>}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="gap-1 text-muted-foreground">
      <ChevronLeft className="w-4 h-4" /> Voltar
    </Button>
  );
}
