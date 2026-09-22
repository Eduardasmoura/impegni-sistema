"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle, HelpCircle, Webhook, Database, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${ok ? "bg-chart-2/15 text-chart-2" : "bg-destructive/15 text-destructive"}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {label}
    </span>
  );
}

function NaoMonitorado({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium bg-muted text-muted-foreground">
      <HelpCircle className="w-4 h-4" /> {label}
    </span>
  );
}

export function SaudeView({ dbOk, webhooks24h, webhooks7d, webhookErrors, auditCount24h, subscriptionsPastDue, companiesSuspended, loadError }: {
  dbOk: boolean;
  webhooks24h: { status: string }[];
  webhooks7d: { status: string }[];
  webhookErrors: { id: string; event_type: string; error_message: string | null; received_at: string; company_id: string | null }[];
  auditCount24h: number;
  subscriptionsPastDue: number;
  companiesSuspended: number;
  loadError?: string;
}) {
  const resumo24h = useMemo(() => {
    const r: Record<string, number> = {};
    for (const w of webhooks24h) r[w.status] = (r[w.status] ?? 0) + 1;
    return r;
  }, [webhooks24h]);
  const resumo7d = useMemo(() => {
    const r: Record<string, number> = {};
    for (const w of webhooks7d) r[w.status] = (r[w.status] ?? 0) + 1;
    return r;
  }, [webhooks7d]);

  const taxaErro7d = webhooks7d.length > 0 ? ((resumo7d.error ?? 0) / webhooks7d.length) * 100 : null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">Saúde do Sistema</h1>
        <p className="text-sm text-muted-foreground">Apenas o que é genuinamente verificável hoje — o que não tem monitoramento configurado aparece como tal, nunca como &quot;OK&quot; forjado.</p>
      </div>

      {loadError && <Card className="mb-4 border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Erro ao carregar saúde do sistema: {loadError}</CardContent></Card>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Banco de dados</p><StatusPill ok={dbOk} label={dbOk ? "Respondendo" : "Erro nas consultas"} /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Webhook className="w-3.5 h-3.5" /> Webhooks Asaas (24h)</p>{webhooks24h.length === 0 ? <NaoMonitorado label="Sem eventos" /> : <StatusPill ok={(resumo24h.error ?? 0) === 0} label={`${resumo24h.error ?? 0} erro(s) de ${webhooks24h.length}`} />}</CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2">Uptime / infraestrutura</p><NaoMonitorado label="Não monitorado" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2">Filas / jobs em background</p><NaoMonitorado label="Não monitorado" /></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Webhooks — últimos 7 dias</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span>Recebidos</span><span className="font-semibold">{webhooks7d.length}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Processados</span><span className="font-semibold text-chart-2">{resumo7d.processed ?? 0}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Ignorados (skipped)</span><span className="font-semibold text-muted-foreground">{resumo7d.skipped ?? 0}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Com erro</span><span className="font-semibold text-destructive">{resumo7d.error ?? 0}</span></div>
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border"><span>Taxa de erro</span><span className="font-semibold">{taxaErro7d === null ? "—" : `${taxaErro7d.toFixed(1)}%`}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ScrollText className="w-4 h-4" /> Sinais de atenção</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span>Eventos de auditoria (24h)</span><span className="font-semibold">{auditCount24h}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Assinaturas com pagamento atrasado</span><span className={`font-semibold ${subscriptionsPastDue > 0 ? "text-chart-4" : ""}`}>{subscriptionsPastDue}</span></div>
            <div className="flex items-center justify-between text-sm"><span>Empresas suspensas</span><span className={`font-semibold ${companiesSuspended > 0 ? "text-destructive" : ""}`}>{companiesSuspended}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos erros de webhook (7 dias)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {webhookErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhum erro registrado nos últimos 7 dias.</p>
          ) : (
            <div className="divide-y divide-border">
              {webhookErrors.map((w) => (
                <div key={w.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">{w.event_type}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDateTime(w.received_at)}</span>
                  </div>
                  {w.error_message && <p className="text-xs text-muted-foreground mt-1">{w.error_message}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
