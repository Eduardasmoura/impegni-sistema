import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { RelatoriosView } from "./relatorios-view";

export default async function RelatoriosPage({ searchParams }: { searchParams: { de?: string; ate?: string } }) {
  const { user, supabase } = await requireSuperAdmin();

  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
  const de = searchParams.de || trintaDiasAtras.toISOString().slice(0, 10);
  const ate = searchParams.ate || hoje.toISOString().slice(0, 10);

  const [{ data: summaryRows, error }, { data: porPlano }] = await Promise.all([
    supabase.rpc("admin_dashboard_summary", { p_from: `${de}T00:00:00Z`, p_to: `${ate}T23:59:59Z` }),
    supabase.rpc("admin_companies_by_plan"),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <RelatoriosView summary={summaryRows?.[0] ?? null} porPlano={porPlano ?? []} de={de} ate={ate} loadError={error?.message} />
    </AdminShell>
  );
}
