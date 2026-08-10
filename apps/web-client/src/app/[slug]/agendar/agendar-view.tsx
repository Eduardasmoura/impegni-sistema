"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Scissors, Calendar as CalIcon, Check, ChevronLeft, LogIn, UserPlus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import type { Tables } from "@/lib/supabase/database.types";

const STEPS = ["Serviço", "Profissional", "Horário", "Confirmação"];
const METODOS = [
  { chave: "pix", label: "Pix" },
  { chave: "card", label: "Cartão" },
  { chave: "cash", label: "Dinheiro" },
];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AgendarView({ company }: { company: Tables<"companies"> }) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [metodo, setMetodo] = useState("pix");
  const [loading, setLoading] = useState(false);

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

  // Agendamentos do dia selecionado, só pra checar conflito de horário (a
  // policy pública de SELECT em `appointments` não existe — por isso este
  // cálculo roda com a sessão do usuário quando logado; sem login, mostramos
  // o dia inteiro como "disponível" e o INSERT final é quem garante
  // integridade via RLS + o trigger de negócio do lado do servidor).
  const { data: agendaDoDia = [] } = useQuery({
    queryKey: ["appointments-day", company.id, data, professionalId],
    enabled: !!data && !!user,
    queryFn: async () => {
      const inicio = new Date(`${data}T00:00:00`).toISOString();
      const fim = new Date(`${data}T23:59:59`).toISOString();
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("company_id", company.id)
        .gte("scheduled_at", inicio)
        .lte("scheduled_at", fim)
        .neq("status", "canceled");
      if (professionalId) query = query.eq("professional_id", professionalId);
      const { data: rows, error } = await query;
      if (error) return [];
      return rows as Tables<"appointments">[];
    },
  });

  const slots = useMemo(() => {
    if (!servico || !data) return [];
    const profs = professional ? [professional] : professionals;
    if (profs.length === 0) return [];
    const resultado = new Map<string, boolean>();

    for (const prof of profs) {
      const [hIni, mIni] = (prof.start_time || "09:00").slice(0, 5).split(":").map(Number);
      const [hFim, mFim] = (prof.end_time || "18:00").slice(0, 5).split(":").map(Number);
      const fimExpediente = new Date(`${data}T${String(hFim).padStart(2, "0")}:${String(mFim).padStart(2, "0")}:00`);

      for (let h = hIni, m = mIni; h < hFim || (h === hFim && m === 0); ) {
        const inicioSlot = new Date(`${data}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
        const fimSlot = new Date(inicioSlot.getTime() + servico.duration_min * 60000);
        if (fimSlot > fimExpediente) break;
        const horaSlot = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (!resultado.has(horaSlot)) resultado.set(horaSlot, false);

        const conflito = agendaDoDia.some((a) => {
          if (!professional && a.professional_id !== prof.id) return false;
          const inicioA = new Date(a.scheduled_at);
          const fimA = new Date(inicioA.getTime() + (a.duration_min || 30) * 60000);
          return inicioSlot < fimA && fimSlot > inicioA;
        });
        if (!conflito) resultado.set(horaSlot, true);

        m += 30;
        if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
      }
    }
    return Array.from(resultado.entries()).map(([hora, disponivel]) => ({ hora, disponivel })).sort((a, b) => a.hora.localeCompare(b.hora));
  }, [servico, data, professional, professionals, agendaDoDia]);

  const termino = useMemo(() => {
    if (!hora || !servico) return null;
    const inicio = new Date(`${data}T${hora}:00`);
    return new Date(inicio.getTime() + servico.duration_min * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }, [hora, data, servico]);

  async function confirmar() {
    if (!servico || !user) return;
    setLoading(true);
    try {
      // Reaproveita o cadastro do cliente pelo telefone, se já existir; um
      // cliente com conta sempre tem no máximo um registro `clients` por
      // empresa (unique(company_id, user_id)) — buscamos primeiro por isso.
      let { data: clientRow } = await supabase.from("clients").select("*").eq("company_id", company.id).eq("user_id", user.id).maybeSingle();
      if (!clientRow) {
        const { data: novoCliente, error: clientError } = await supabase
          .from("clients")
          .insert({ company_id: company.id, user_id: user.id, name: nome, phone: telefone })
          .select()
          .single();
        if (clientError) throw clientError;
        clientRow = novoCliente;
      } else if (nome !== clientRow.name || telefone !== clientRow.phone) {
        await supabase.from("clients").update({ name: nome, phone: telefone }).eq("id", clientRow.id);
      }

      const scheduledAt = new Date(`${data}T${hora}:00`).toISOString();
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          company_id: company.id,
          client_id: clientRow.id,
          professional_id: professionalId!,
          service_id: serviceId!,
          scheduled_at: scheduledAt,
          duration_min: servico.duration_min,
          price: servico.price,
          origin: "client_web",
          payment_method: metodo,
          created_by: user.id,
        })
        .select()
        .single();
      if (appointmentError) throw appointmentError;

      await supabase.from("payments").insert({
        company_id: company.id,
        appointment_id: appointment.id,
        client_id: clientRow.id,
        amount: servico.price,
        method: metodo,
        status: "pending",
      });

      toast({ title: "Agendamento confirmado!", description: `${servico.name} em ${new Date(scheduledAt).toLocaleString("pt-BR")}` });
      router.push("/meus-agendamentos");
    } catch (e) {
      toast({ title: "Erro ao agendar", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading text-3xl font-semibold mb-1">Agendar em {company.name}</h1>
        <p className="text-muted-foreground text-sm mb-6">Escolha o serviço, profissional e horário.</p>

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
          <div className="grid grid-cols-2 gap-3">
            {services.map((s) => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setStep(1); }} className="text-left">
                <Card className={cn("hover:shadow-md transition-shadow h-full", serviceId === s.id && "ring-2 ring-primary")}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5"><Clock className="w-3 h-3" />{s.duration_min} min</div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="font-semibold text-primary text-sm mt-1">{formatCurrency(Number(s.price))}</p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button onClick={() => { setProfessionalId(null); setData(""); setHora(""); setStep(2); }} className="text-left">
                <Card className={cn("p-4 hover:shadow-md transition-shadow h-full", !professionalId && "ring-2 ring-primary")}>
                  <div className="aspect-square rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Scissors className="w-8 h-8" /></div>
                  <p className="font-medium text-sm mt-2 text-center">Qualquer profissional</p>
                </Card>
              </button>
              {professionals.map((p) => (
                <button key={p.id} onClick={() => { setProfessionalId(p.id); setData(""); setHora(""); setStep(2); }} className="text-left">
                  <Card className={cn("overflow-hidden hover:shadow-md transition-shadow h-full", professionalId === p.id && "ring-2 ring-primary")}>
                    <div className="aspect-square bg-muted flex items-center justify-center text-2xl text-muted-foreground">{p.name?.[0]}</div>
                    <CardContent className="p-2">
                      <p className="font-medium text-sm text-center">{p.name}</p>
                      <p className="text-xs text-muted-foreground text-center capitalize">{p.role_title}</p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
            <BackBtn onClick={() => setStep(0)} />
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data</label>
                <input
                  type="date"
                  min={toDateStr(new Date())}
                  value={data}
                  onChange={(e) => { setData(e.target.value); setHora(""); }}
                  className="w-full mt-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              {data && (
                <div>
                  <label className="text-sm font-medium">Horários disponíveis</label>
                  {slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">Nenhum horário disponível neste dia.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.hora}
                          disabled={!slot.disponivel}
                          onClick={() => setHora(slot.hora)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm border transition-colors",
                            !slot.disponivel
                              ? "bg-muted text-muted-foreground/40 line-through cursor-not-allowed border-border"
                              : hora === slot.hora
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-primary/40 text-primary hover:bg-primary/10"
                          )}
                        >
                          {slot.hora}
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

        {step === 3 && servico && (
          <>
            <Card className="overflow-hidden">
              <div className="p-4">
                <h3 className="font-heading text-lg font-semibold">{servico.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><User className="w-3.5 h-3.5" />{professional?.name || "Qualquer profissional"}</p>
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
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-heading text-2xl font-bold text-primary">{formatCurrency(Number(servico.price))}</span>
                </div>
                {user && (
                  <>
                    <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
                    <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone / WhatsApp" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
                    <div>
                      <label className="text-sm font-medium">Forma de pagamento</label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
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
                    </div>
                  </>
                )}
              </div>
            </Card>
            <div className="flex justify-between mt-6">
              <BackBtn onClick={() => setStep(2)} />
              {user && (
                <Button disabled={!nome || !telefone || loading} onClick={confirmar} className="gap-2">
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
