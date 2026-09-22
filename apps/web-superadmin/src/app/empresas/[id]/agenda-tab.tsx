"use client";

// Agenda da empresa vista pelo Super Admin — mesma tabela `appointments`
// que o web-professional usa, só que somente leitura e sem as ações de
// edição/cancelamento (isso continua sendo tarefa do dono da empresa).
// RLS de `appointments` já inclui private.is_super_admin() na policy de
// select (confirmado na auditoria) — nenhuma mudança de banco necessária.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ProfessionalRow, ServiceRow } from "./empresa-detail-view";

const ALL = "__all__";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em andamento",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não compareceu",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-chart-4/15 text-chart-4",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-chart-2/15 text-chart-2",
  canceled: "bg-muted text-muted-foreground",
  no_show: "bg-destructive/15 text-destructive",
};

function inicioMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function fimMesISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function AgendaTab({ companyId, professionals, services }: { companyId: string; professionals: ProfessionalRow[]; services: ServiceRow[] }) {
  const supabase = createClient();
  const [de, setDe] = useState(inicioMesISO());
  const [ate, setAte] = useState(fimMesISO());
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-agenda", companyId, de, ate, profissionalId, servicoId, status],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("id, scheduled_at, duration_min, price, status, professionals(name), clients(name), services(name)")
        .eq("company_id", companyId)
        .gte("scheduled_at", `${de}T00:00:00Z`)
        .lte("scheduled_at", `${ate}T23:59:59Z`)
        .order("scheduled_at", { ascending: false })
        .limit(200);
      if (profissionalId) query = query.eq("professional_id", profissionalId);
      if (servicoId) query = query.eq("service_id", servicoId);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Array<{
        id: string; scheduled_at: string; duration_min: number; price: number; status: string;
        professionals: { name: string } | null; clients: { name: string } | null; services: { name: string } | null;
      }>;
    },
  });

  const resumo = useMemo(() => {
    const rows = data ?? [];
    const porStatus: Record<string, number> = {};
    let receitaConfirmada = 0;
    for (const a of rows) {
      porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
      if (a.status === "completed") receitaConfirmada += Number(a.price ?? 0);
    }
    return { total: rows.length, porStatus, receitaConfirmada };
  }, [data]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <p className="text-sm text-muted-foreground mb-4">
        Agendamentos reais da empresa — somente leitura. Edição e cancelamento continuam exclusivos do painel da própria empresa.
      </p>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <Select value={profissionalId || ALL} onValueChange={(v) => setProfissionalId(v === ALL ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Profissional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os profissionais</SelectItem>
              {professionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={servicoId || ALL} onValueChange={(v) => setServicoId(v === ALL ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Serviço" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os serviços</SelectItem>
              {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status || ALL} onValueChange={(v) => setStatus(v === ALL ? "" : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar agenda: {(error as Error).message}</CardContent></Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">No período</p><p className="text-2xl font-bold font-heading mt-1">{resumo.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Concluídos</p><p className="text-2xl font-bold font-heading mt-1 text-chart-2">{resumo.porStatus.completed ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cancelados / faltou</p><p className="text-2xl font-bold font-heading mt-1 text-destructive">{(resumo.porStatus.canceled ?? 0) + (resumo.porStatus.no_show ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receita em concluídos</p><p className="text-xl font-bold font-heading mt-1">{formatCurrency(resumo.receitaConfirmada)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : (data ?? []).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />Nenhum agendamento no período.</div>
          ) : (
            <div className="divide-y divide-border">
              {(data ?? []).map((a) => (
                <div key={a.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[a.status] ?? "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(a.scheduled_at)}</span>
                  <span className="flex-1 min-w-[140px]">{a.clients?.name ?? "—"}</span>
                  <span className="text-muted-foreground min-w-[120px]">{a.services?.name ?? "—"}</span>
                  <span className="text-muted-foreground min-w-[120px]">{a.professionals?.name ?? "—"}</span>
                  <span className="font-medium shrink-0">{formatCurrency(a.price)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
