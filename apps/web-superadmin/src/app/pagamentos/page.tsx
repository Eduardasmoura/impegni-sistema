import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { PagamentosView, type PaymentRow } from "./pagamentos-view";

const PAGE_SIZE = 25;

// Fonte de dados: `subscription_payments`, escrita só pelo webhook do
// Asaas (nunca pelo frontend) — ver migration 038 e a edge function
// asaas-webhook. Esta tela é 100% leitura.
export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; pagina?: string };
}) {
  const { user, supabase } = await requireSuperAdmin();

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const status = typeof searchParams.status === "string" ? searchParams.status : "";
  const page = Math.max(1, Number(searchParams.pagina) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let companyIdsForSearch: string[] | null = null;
  if (q) {
    const safe = q.replace(/[%,]/g, "");
    const { data: matches } = await supabase.from("companies").select("id").or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`);
    companyIdsForSearch = (matches ?? []).map((c) => c.id);
    if (companyIdsForSearch.length === 0) companyIdsForSearch = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("subscription_payments")
    .select("*, companies(id, name, slug), subscriptions(id, plan_id, plans(name))", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (companyIdsForSearch) query = query.in("company_id", companyIdsForSearch);

  const { data: payments, count, error } = await query.range(from, to);

  return (
    <AdminShell userEmail={user.email}>
      <PagamentosView
        payments={(payments as PaymentRow[]) ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        filters={{ q, status }}
        loadError={error?.message}
      />
    </AdminShell>
  );
}
