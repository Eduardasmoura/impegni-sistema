"use client";

import { useMemo, useState } from "react";
import { Plus, LifeBuoy, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

const ALL = "__all__";

const STATUS_LABEL: Record<string, string> = { open: "Aberto", in_progress: "Em andamento", waiting_company: "Aguardando empresa", resolved: "Resolvido", closed: "Fechado" };
// Mesmas chaves de support_tickets.category (formulário do painel do profissional).
const CATEGORY_LABEL: Record<string, string> = {
  problema_tecnico: "Problema técnico", agenda: "Agenda", financeiro: "Financeiro", pagamentos: "Pagamentos", pacotes: "Pacotes recorrentes",
  clientes: "Clientes", conta: "Conta", outro: "Outro", duvida: "Dúvida sobre o sistema", sugestao: "Sugestão",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-chart-4/15 text-chart-4", in_progress: "bg-primary/15 text-primary", waiting_company: "bg-chart-4/15 text-chart-4",
  resolved: "bg-chart-2/15 text-chart-2", closed: "bg-muted text-muted-foreground",
};
const PRIORITY_LABEL: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
const PRIORITY_COLOR: Record<string, string> = { low: "bg-muted text-muted-foreground", normal: "bg-primary/10 text-primary", high: "bg-chart-4/15 text-chart-4", urgent: "bg-destructive/15 text-destructive" };

type TicketRow = Tables<"support_tickets"> & { companies: { id: string; name: string } | null; opened_by_name: string | null; assigned_to_name: string | null };

const NOVO = { company_id: "", subject: "", description: "", priority: "normal" as const };

export function SuporteView({ tickets: initial, companies, loadError, currentUserId }: {
  tickets: TicketRow[]; companies: { id: string; name: string }[]; loadError?: string; currentUserId: string;
}) {
  const { toast } = useToast();
  const supabase = createClient();
  const [tickets, setTickets] = useState(initial);
  const [statusFiltro, setStatusFiltro] = useState("");
  const [novo, setNovo] = useState(NOVO);
  const [criando, setCriando] = useState(false);
  const [open, setOpen] = useState(false);
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const filtrados = useMemo(() => (statusFiltro ? tickets.filter((t) => t.status === statusFiltro) : tickets), [tickets, statusFiltro]);

  async function criarTicket() {
    if (!novo.company_id || !novo.subject.trim()) {
      toast({ title: "Selecione a empresa e informe o assunto", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({ company_id: novo.company_id, subject: novo.subject.trim(), description: novo.description.trim() || null, priority: novo.priority, opened_by: currentUserId })
      .select("*, companies(id, name)")
      .single();
    setCriando(false);
    if (error || !data) {
      toast({ title: "Erro ao criar chamado", description: error?.message, variant: "destructive" });
      return;
    }
    setTickets((prev) => [{ ...data, opened_by_name: null, assigned_to_name: null }, ...prev]);
    setNovo(NOVO);
    setOpen(false);
    toast({ title: "Chamado criado" });
  }

  async function atualizarStatus(ticket: TicketRow, status: string) {
    setAtualizando(ticket.id);
    const closed_at = status === "resolved" || status === "closed" ? new Date().toISOString() : null;
    const { error } = await supabase.from("support_tickets").update({ status, closed_at }).eq("id", ticket.id);
    setAtualizando(null);
    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status, closed_at } : t)));
  }

  async function assumirTicket(ticket: TicketRow) {
    setAtualizando(ticket.id);
    const { error } = await supabase.from("support_tickets").update({ assigned_to: currentUserId, status: ticket.status === "open" ? "in_progress" : ticket.status }).eq("id", ticket.id);
    setAtualizando(null);
    if (error) {
      toast({ title: "Erro ao assumir chamado", description: error.message, variant: "destructive" });
      return;
    }
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, assigned_to: currentUserId, assigned_to_name: "Você", status: t.status === "open" ? "in_progress" : t.status } : t)));
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Suporte</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} chamado(s) registrados.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Novo chamado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo chamado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Select value={novo.company_id} onValueChange={(v) => setNovo({ ...novo, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input value={novo.subject} onChange={(e) => setNovo({ ...novo, subject: e.target.value })} placeholder="Ex: Cliente não recebe notificação" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={novo.description} onChange={(e) => setNovo({ ...novo, description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={novo.priority} onValueChange={(v) => setNovo({ ...novo, priority: v as typeof novo.priority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={criarTicket} disabled={criando}>{criando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar chamado"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loadError && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar chamados: {loadError}</CardContent></Card>}

      <Card className="mb-4">
        <CardContent className="p-4">
          <Select value={statusFiltro || ALL} onValueChange={(v) => setStatusFiltro(v === ALL ? "" : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtrados.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status] ?? "bg-muted"}`}>{STATUS_LABEL[t.status] ?? t.status}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[t.priority] ?? "bg-muted"}`}>{PRIORITY_LABEL[t.priority] ?? t.priority}</span>
                {t.category && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-foreground/80">{CATEGORY_LABEL[t.category] ?? t.category}</span>}
                <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(t.created_at)}</span>
              </div>
              <p className="font-medium">{t.subject}</p>
              <p className="text-sm text-muted-foreground">{t.companies?.name ?? "—"}</p>
              {t.description && <p className="text-sm mt-2">{t.description}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Responsável: {t.assigned_to_name ?? "Ninguém"}</span>
                {!t.assigned_to && (
                  <Button size="sm" variant="outline" onClick={() => assumirTicket(t)} disabled={atualizando === t.id}>Assumir</Button>
                )}
                <Select value={t.status} onValueChange={(v) => atualizarStatus(t, v)}>
                  <SelectTrigger className="w-[180px] h-8 ml-auto"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtrados.length === 0 && !loadError && (
          <Card><CardContent className="py-16 text-center text-muted-foreground"><LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-40" />Nenhum chamado encontrado.</CardContent></Card>
        )}
      </div>
    </main>
  );
}
