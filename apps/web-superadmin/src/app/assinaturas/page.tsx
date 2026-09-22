import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { AssinaturasView, type SubscriptionRow } from "./assinaturas-view";

const PAGE_SIZE = 20;

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; plano?: string; pagina?: string };
}) {
  const { user, supabase } = await requireSuperAdmin();

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "";
  const plano = typeof searchParams.plano === "string" ? searchParams.plano : "";
  const page = Math.max(1, Number(searchParams.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: plans } = await supabase.from("plans").select("id, name").order("price_cents");

  // Busca por nome/slug da empresa vive em `companies`, não em
  // `subscriptions` — resolve os ids primeiro (mesmo padrão da tela de
  // Empresas), depois filtra as assinaturas por eles.
  let companyIdsForSearch: string[] | null = null;
  if (q) {
    const safe = q.replace(/[%,]/g, "");
    const { data: matches } = await supabase.from("companies").select("id").or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    companyIdsForSearch = (matches ?? []).map((c) => c.id);
    if (companyIdsForSearch.length === 0) companyIdsForSearch = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("subscriptions")
    .select("*, companies(id, name, slug, status), plans(id, name, price_cents, billing_interval)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (plano) query = query.eq("plan_id", plano);
  if (companyIdsForSearch) query = query.in("company_id", companyIdsForSearch);

  const { data: subscriptions, count, error } = await query.range(from, to);

  return (
    <AdminShell userEmail={user.email}>
      <AssinaturasView
        subscriptions={(subscriptions as SubscriptionRow[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        plans={plans ?? []}
        filters={{ q, status, plano }}
        loadError={error?.message}
      />
    </AdminShell>
  );
}
