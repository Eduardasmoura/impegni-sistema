"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { DollarSign, CalendarDays, Users, TrendingUp, Play, Pause, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

const PERIODOS = [
  { key: "dia", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
] as const;
type Periodo = (typeof PERIODOS)[number]["key"];

const HORAS_EXPEDIENTE_POR_PERIODO: Record<Periodo, number> = { dia: 8, semana: 56, mes: 240, ano: 2880 };
const CORES_METODO: Record<string, string> = { pix: "hsl(var(--chart-1))", card: "hsl(var(--chart-2))", cash: "hsl(var(--chart-4))" };

export function DashboardView({ companyId }: { companyId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const { toast } = useToast();
  const qc = useQueryClient();
  const supabase = createClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").eq("company_id", companyId).order("scheduled_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tables<"appointments">[];
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Tables<"payments">[];
    },
  });
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("*").eq("company_id", companyId);
      if (error) throw error;
      return data as Tables<"professionals">[];
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

  const limite = useMemo(() => {
    const d = new Date();
    if (periodo === "dia") d.setHours(0, 0, 0, 0);
    if (periodo === "semana") d.setDate(d.getDate() - 7);
    if (periodo === "mes") d.setMonth(d.getMonth() - 1);
    if (periodo === "ano") d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [periodo]);

  const appointmentsPeriodo = appointments.filter((a) => new Date(a.scheduled_at) >= limite);
  const paymentsPeriodo = payments.filter((p) => new Date(p.created_at) >= limite && p.status === "paid");
  const faturamento = paymentsPeriodo.reduce((s, p) => s + Number(p.amount || 0), 0);
  const ocupacao = professionals.length
    ? Math.round((appointmentsPeriodo.length / (professionals.length * HORAS_EXPEDIENTE_POR_PERIODO[periodo])) * 100)
    : 0;

  const serieFaturamento = useMemo(() => {
    const grupos: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const d = new Date(p.created_at);
      const chave = periodo === "ano" ? d.toLocaleDateString("pt-BR", { month: "short" }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      grupos[chave] = (grupos[chave] || 0) + Number(p.amount || 0);
    });
    return Object.entries(grupos).map(([data, valor]) => ({ data, valor }));
  }, [paymentsPeriodo, periodo]);

  const faturamentoPorProfissional = useMemo(() => {
    return professionals
      .map((prof) => {
        const total = paymentsPeriodo
          .filter((pg) => appointmentsPeriodo.find((a) => a.id === pg.appointment_id && a.professional_id === prof.id))
          .reduce((s, pg) => s + Number(pg.amount || 0), 0);
        const atendimentos = appointmentsPeriodo.filter((a) => a.professional_id === prof.id).length;
        return { nome: prof.name.split(" ")[0], faturamento: total, atendimentos };
      })
      .filter((x) => x.atendimentos > 0);
  }, [professionals, paymentsPeriodo, appointmentsPeriodo]);

  const porMetodoPagamento = useMemo(() => {
    const totais: Record<string, number> = {};
    paymentsPeriodo.forEach((p) => {
      const chave = p.method || "outro";
      totais[chave] = (totais[chave] || 0) + Number(p.amount || 0);
    });
    return Object.entries(totais).map(([name, value]) => ({ name, value, fill: CORES_METODO[name] || "hsl(var(--chart-3))" }));
  }, [paymentsPeriodo]);

  async function mudarStatus(appointment: Tables<"appointments">, status: string) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["appointments", companyId] });
    toast({ title: "Status atualizado" });
  }

  const hoje = new Date();
  const agendamentosHoje = appointments
    .filter((a) => new Date(a.scheduled_at).toDateString() === hoje.toDateString() && a.status !== "canceled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", periodo === p.key ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={DollarSign} label="Faturamento" value={formatCurrency(faturamento)} color="text-primary" />
        <KpiCard icon={CalendarDays} label="Atendimentos" value={String(appointmentsPeriodo.length)} color="text-chart-2" />
        <KpiCard icon={Users} label="Clientes" value={String(clients.length)} color="text-chart-4" />
        <KpiCard icon={TrendingUp} label="Ocupação" value={`${ocupacao}%`} color="text-chart-5" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Faturamento no período</CardTitle></CardHeader>
          <CardContent>
            {serieFaturamento.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={serieFaturamento}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Formas de pagamento</CardTitle></CardHeader>
          <CardContent>
            {porMetodoPagamento.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={porMetodoPagamento} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {porMetodoPagamento.map((m) => <Cell key={m.name} fill={m.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento por profissional</CardTitle></CardHeader>
          <CardContent>
            {faturamentoPorProfissional.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={faturamentoPorProfissional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Fila de hoje</CardTitle>
            <span className="text-xs text-muted-foreground">{agendamentosHoje.length} agendamentos</span>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[240px] overflow-y-auto">
            {agendamentosHoje.length === 0 ? <Empty text="Nenhum agendamento hoje" /> : agendamentosHoje.map((a) => {
              const client = clients.find((c) => c.id === a.client_id);
              const professional = professionals.find((p) => p.id === a.professional_id);
              return (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="text-center w-12 shrink-0">
                    <p className="text-xs text-muted-foreground">{formatTime(a.scheduled_at)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client?.name || "Cliente"}</p>
                    <p className="text-xs text-muted-foreground truncate">{professional?.name} · {formatCurrency(Number(a.price))}</p>
                  </div>
                  <div className="flex gap-1">
                    {a.status === "scheduled" && <IconBtn icon={Play} color="text-chart-2" onClick={() => mudarStatus(a, "in_progress")} />}
                    {a.status === "in_progress" && <IconBtn icon={Pause} color="text-chart-4" onClick={() => mudarStatus(a, "scheduled")} />}
                    {(a.status === "scheduled" || a.status === "in_progress") && <IconBtn icon={Check} color="text-primary" onClick={() => mudarStatus(a, "completed")} />}
                    {a.status === "completed" && <span className="text-xs text-primary px-2">✓</span>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: typeof DollarSign; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <p className="font-heading text-2xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}

function IconBtn({ icon: Icon, color, onClick }: { icon: typeof Play; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("p-1.5 rounded-lg hover:bg-muted", color)}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Empty({ text = "Sem dados no período" }: { text?: string }) {
  return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
