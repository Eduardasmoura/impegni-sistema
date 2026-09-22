import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { SaudeView } from "./saude-view";

// Saúde do Sistema — só o que é genuinamente verificável hoje:
// - Banco de dados: se as queries desta página funcionaram, o banco
//   respondeu (não é um health-check dedicado, mas é um fato real, não
//   inventado).
// - Webhooks Asaas: `payment_webhook_events` já registra todo evento
//   recebido/processado/com erro (tabela existente, sem migration nova).
// - Atividade administrativa: `audit_logs` das últimas 24h.
// Não existe monitoramento de Edge Functions, uptime ou fila configurado —
// por isso essas áreas aparecem como "Não monitorado", nunca como "OK".
export default async function SaudePage() {
  const { user, supabase } = await requireSuperAdmin();

  const ultimas24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ultimos7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: webhooks24h, error: e1 },
    { data: webhooks7d, error: e2 },
    { data: webhookErrors, error: e3 },
    { count: auditCount24h, error: e4 },
    { count: subscriptionsPastDue },
    { count: companiesSuspended },
  ] = await Promise.all([
    supabase.from("payment_webhook_events").select("status").gte("received_at", ultimas24h),
    supabase.from("payment_webhook_events").select("status").gte("received_at", ultimos7dias),
    supabase.from("payment_webhook_events").select("id, event_type, error_message, received_at, company_id").eq("status", "error").gte("received_at", ultimos7dias).order("received_at", { ascending: false }).limit(20),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", ultimas24h),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "past_due"),
    supabase.from("companies").select("*", { count: "exact", head: true }).eq("status", "suspended"),
  ]);

  const dbOk = !e1 && !e2 && !e3 && !e4;
  const loadError = e1?.message || e2?.message || e3?.message || e4?.message;

  return (
    <AdminShell userEmail={user.email}>
      <SaudeView
        dbOk={dbOk}
        webhooks24h={webhooks24h ?? []}
        webhooks7d={webhooks7d ?? []}
        webhookErrors={webhookErrors ?? []}
        auditCount24h={auditCount24h ?? 0}
        subscriptionsPastDue={subscriptionsPastDue ?? 0}
        companiesSuspended={companiesSuspended ?? 0}
        loadError={loadError}
      />
    </AdminShell>
  );
}
