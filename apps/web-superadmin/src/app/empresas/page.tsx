import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { EmpresasView, type CompanyRow } from "./empresas-view";

const PAGE_SIZE = 15;

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; plano?: string; segmento?: string; pagina?: string };
}) {
  const { user, supabase } = await requireSuperAdmin();

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "";
  const plano = typeof searchParams.plano === "string" ? searchParams.plano : "";
  const segmento = typeof searchParams.segmento === "string" ? searchParams.segmento : "";
  const page = Math.max(1, Number(searchParams.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: segments }, { data: plans }] = await Promise.all([
    supabase.from("segments").select("id, name").order("name"),
    supabase.from("plans").select("id, name").order("price_cents"),
  ]);

  // O filtro por plano vive em `subscriptions`, não em `companies` — resolve
  // primeiro os ids das empresas com aquele plano, depois filtra por eles.
  let companyIdsForPlan: string[] | null = null;
  if (plano) {
    const { data: subs } = await supabase.from("subscriptions").select("company_id").eq("plan_id", plano);
    companyIdsForPlan = (subs ?? []).map((s) => s.company_id);
    if (companyIdsForPlan.length === 0) companyIdsForPlan = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("companies")
    .select("*, segments(name, theme_key), subscriptions(status, plan_id, trial_ends_at, plans(name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("created_at", { foreignTable: "subscriptions", ascending: false });

  if (q) {
    const safe = q.replace(/[%,]/g, "");
    query = query.or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
  }
  if (status) query = query.eq("status", status);
  if (segmento) query = query.eq("segment_id", segmento);
  if (companyIdsForPlan) query = query.in("id", companyIdsForPlan);

  const { data: companies, count, error } = await query.range(from, to);

  // Responsável de cada empresa da página — 1 round-trip pra todas, não 1
  // por linha. Só decora a listagem; a fonte de verdade continua sendo
  // `company_members`/`admin_list_company_users` (usado no detalhe).
  const companyIds = (companies ?? []).map((c) => c.id);
  const { data: owners } = companyIds.length > 0 ? await supabase.rpc("admin_list_companies_owners", { p_company_ids: companyIds }) : { data: [] };
  const ownerByCompany = Object.fromEntries((owners ?? []).map((o) => [o.company_id, { full_name: o.full_name, email: o.email }]));

  return (
    <AdminShell userEmail={user.email}>
      <EmpresasView
        companies={(companies as CompanyRow[]) ?? []}
        owners={ownerByCompany}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        segments={segments ?? []}
        plans={plans ?? []}
        filters={{ q, status, plano, segmento }}
        loadError={error?.message}
      />
    </AdminShell>
  );
}
