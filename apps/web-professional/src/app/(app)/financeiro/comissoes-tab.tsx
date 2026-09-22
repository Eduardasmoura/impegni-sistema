"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Lock, CheckCircle2, Wallet2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { Tables } from "@/lib/supabase/database.types";

const STATUS_REPASSE: Record<string, { label: string; tone: string }> = {
  open: { label: "Aberto", tone: "text-muted-foreground" },
  closed: { label: "Fechado", tone: "text-chart-4" },
  paid: { label: "Pago", tone: "text-chart-2" },
};

function mesAtualISO() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

/**
 * Aba Comissões — é a antiga aba "Repasse", só renomeada e com um resumo
 * novo no topo (quanto está pago vs. pendente, somando os períodos já
 * calculados). NENHUMA regra de cálculo foi tocada: continua usando as
 * MESMAS 3 RPCs de sempre (`calculate_professional_payout`,
 * `close_payout_period`, `mark_payout_paid`, migrations 058-061).
 */
export function ComissoesTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const supabase = createClient();
  const periodoPadrao = mesAtualISO();
  const [profissionalId, setProfissionalId] = useState("");
  const [periodStart, setPeriodStart] = useState(periodoPadrao.inicio);
  const [periodEnd, setPeriodEnd] = useState(periodoPadrao.fim);
  const [preview, setPreview] = useState<{ total_appointments: number; total_revenue: number; total_commission: number } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [pagando, setPagando] = useState<(Tables<"payout_periods"> & { professionals: { name: string } | null }) | null>(null);
  const [formPagamento, setFormPagamento] = useState({ paid_at: new Date().toISOString().slice(0, 10), payment_method: "pix", notes: "" });
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);

  const { data: profissionais = [] } = useQuery({
    queryKey: ["professionals", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("professionals").select("id, name").eq("company_id", companyId).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: periodos = [], isLoading } = useQuery({
    queryKey: ["payout-periods", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_periods")
        .select("*, professionals(name)")
        .eq("company_id", companyId)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return data as (Tables<"payout_periods"> & { professionals: { name: string } | null })[];
    },
  });

  const totalPago = periodos.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.total_commission), 0);
  const totalPendente = periodos.filter((p) => p.status !== "paid").reduce((s, p) => s + Number(p.total_commission), 0);

  async function calcular() {
    if (!profissionalId) {
      toast({ title: "Escolha um profissional", variant: "destructive" });
      return;
    }
    setCalculando(true);
    const { data, error } = await supabase.rpc("calculate_professional_payout", {
      p_company_id: companyId,
      p_professional_id: profissionalId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });
    setCalculando(false);
    if (error) {
      toast({ title: "Erro ao calcular", description: friendlyError(error, "calcular o repasse"), variant: "destructive" });
      return;
    }
    setPreview(data?.[0] || { total_appointments: 0, total_revenue: 0, total_commission: 0 });
  }

  async function fecharPeriodo() {
    if (!profissionalId) return;
    setFechando(true);
    const { error } = await supabase.rpc("close_payout_period", {
      p_company_id: companyId,
      p_professional_id: profissionalId,
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });
    setFechando(false);
    if (error) {
      toast({ title: "Erro ao fechar período", description: friendlyError(error, "fechar o período"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["payout-periods", companyId] });
    setPreview(null);
    toast({ title: "Período fechado", description: "Os totais foram congelados e não mudam mais." });
  }

  async function confirmarPagamento() {
    if (!pagando || confirmandoPagamento) return;
    setConfirmandoPagamento(true);
    const { error } = await supabase.rpc("mark_payout_paid", {
      p_payout_period_id: pagando.id,
      p_paid_at: new Date(formPagamento.paid_at).toISOString(),
      p_payment_method: formPagamento.payment_method,
      p_notes: formPagamento.notes || undefined,
    });
    setConfirmandoPagamento(false);
    if (error) {
      toast({ title: "Erro ao registrar pagamento", description: friendlyError(error, "registrar o pagamento"), variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["payout-periods", companyId] });
    setPagando(null);
    toast({ title: "Pagamento registrado" });
  }

  return (
    <div className="mt-3 space-y-6">
      {periodos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Comissão paga (todos os períodos)</p>
              <p className="font-heading text-xl font-bold mt-1 text-chart-2 tabular-nums">{formatCurrency(totalPago)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Comissão pendente</p>
              <p className="font-heading text-xl font-bold mt-1 text-chart-4 tabular-nums">{formatCurrency(totalPendente)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4" /> Calcular repasse</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Profissional</Label>
              <Select value={profissionalId} onValueChange={(v) => { setProfissionalId(v); setPreview(null); }}>
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setPreview(null); }} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setPreview(null); }} />
            </div>
          </div>
          <Button variant="outline" onClick={calcular} disabled={calculando || !profissionalId} className="gap-2">
            <Calculator className="w-4 h-4" /> {calculando ? "Calculando..." : "Calcular"}
          </Button>

          {preview && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Atendimentos</p>
                <p className="font-heading text-xl font-bold">{preview.total_appointments}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="font-heading text-xl font-bold">{formatCurrency(preview.total_revenue)}</p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Repasse (comissão)</p>
                <p className="font-heading text-xl font-bold text-primary">{formatCurrency(preview.total_commission)}</p>
              </div>
              <Button onClick={fecharPeriodo} disabled={fechando} className="col-span-3 gap-2">
                <Lock className="w-4 h-4" /> {fechando ? "Fechando..." : "Fechar período"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet2 className="w-4 h-4" /> Períodos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : periodos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum período calculado ainda. Use &quot;Calcular repasse&quot; acima.</p>
          ) : (
            <div className="space-y-2">
              {periodos.map((p) => {
                const st = STATUS_REPASSE[p.status];
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-border flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.professionals?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.period_start)} — {formatDate(p.period_end)} · {p.total_appointments} atendimento(s)
                        {p.status === "paid" && p.paid_at && ` · pago em ${formatDate(p.paid_at)} (${p.payment_method})`}
                      </p>
                    </div>
                    <span className={cn("text-xs font-medium shrink-0", st.tone)}>{st.label}</span>
                    <span className="font-heading font-bold text-primary shrink-0 w-24 text-right tabular-nums">{formatCurrency(Number(p.total_commission))}</span>
                    {p.status === "closed" && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => setPagando(p)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar pago
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pagando} onOpenChange={(o) => !o && setPagando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar repasse como pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {pagando?.professionals?.name} — {formatCurrency(Number(pagando?.total_commission || 0))}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data do pagamento</Label><Input type="date" value={formPagamento.paid_at} onChange={(e) => setFormPagamento({ ...formPagamento, paid_at: e.target.value })} /></div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={formPagamento.payment_method} onValueChange={(v) => setFormPagamento({ ...formPagamento, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea rows={2} value={formPagamento.notes} onChange={(e) => setFormPagamento({ ...formPagamento, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagando(null)}>Cancelar</Button>
            <Button onClick={confirmarPagamento} disabled={confirmandoPagamento}>{confirmandoPagamento ? "Registrando..." : "Confirmar pagamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
