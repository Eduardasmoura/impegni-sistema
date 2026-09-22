import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { AnalyticsView } from "./analytics-view";

// Analytics = tendências históricas (12 meses) e rankings entre empresas —
// complementar ao Dashboard (que é uma foto do período selecionado), não
// uma repetição dele. Nenhuma tabela/RPC nova: tudo vem de
// subscription_payments, subscriptions, companies e appointments, que já
// têm RLS permitindo is_super_admin() (confirmado na auditoria anterior).
export default async function AnalyticsPage() {
  const { user, supabase } = await requireSuperAdmin();

  const dozeMesesAtras = new Date();
  dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 11);
  dozeMesesAtras.setDate(1);
  dozeMesesAtras.setHours(0, 0, 0, 0);

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: payments, error: e1 },
    { data: subs, error: e2 },
    { data: companies, error: e3 },
    { data: topMrr, error: e4 },
    { data: recentAppointments, error: e5 },
    { data: allCompanies },
  ] = await Promise.all([
    supabase.from("subscription_payments").select("value, status, payment_date, due_date, created_at").in("status", ["confirmed", "received"]).gte("created_at", dozeMesesAtras.toISOString()),
    supabase.from("subscriptions").select("canceled_at, created_at, status").gte("created_at", dozeMesesAtras.toISOString()),
    supabase.from("companies").select("created_at, status").gte("created_at", dozeMesesAtras.toISOString()),
    supabase.from("subscriptions").select("company_id, companies(name), plans(name, price_cents, billing_interval)").eq("status", "active"),
    supabase.from("appointments").select("company_id").gte("scheduled_at", trintaDiasAtras).neq("status", "canceled").limit(5000),
    supabase.from("companies").select("id, name"),
  ]);

  const loadError = e1?.message || e2?.message || e3?.message || e4?.message || e5?.message;
  const nameById = new Map((allCompanies ?? []).map((c) => [c.id, c.name]));

  return (
    <AdminShell userEmail={user.email}>
      <AnalyticsView
        payments={payments ?? []}
        subscriptions={subs ?? []}
        companies={companies ?? []}
        topMrr={(topMrr ?? []) as unknown as Array<{ company_id: string; companies: { name: string } | null; plans: { name: string; price_cents: number; billing_interval: string } | null }>}
        recentAppointments={recentAppointments ?? []}
        nameById={Object.fromEntries(nameById)}
        appointmentsSampleCapped={(recentAppointments ?? []).length >= 5000}
        loadError={loadError}
      />
    </AdminShell>
  );
}
