import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { UsuariosView, type UserRow } from "./usuarios-view";

const PAGE_SIZE = 20;

export default async function UsuariosPage({ searchParams }: { searchParams: { q?: string; pagina?: string } }) {
  const { user, supabase } = await requireSuperAdmin();

  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const page = Math.max(1, Number(searchParams.pagina) || 1);

  const { data: users, error } = await supabase.rpc("admin_list_users", {
    p_search: q || undefined,
    p_page: page,
    p_page_size: PAGE_SIZE,
  });

  const total = users?.[0]?.total_count ?? 0;
  // `memberships` volta como jsonb (Json) — a RPC sempre garante um array
  // (coalesce pra '[]'::jsonb), nunca null; o cast só ajusta o tipo pro TS.
  const rows = (users ?? []).map((u) => ({ ...u, memberships: (u.memberships ?? []) as UserRow["memberships"] }));

  return (
    <AdminShell userEmail={user.email}>
      <UsuariosView users={rows} total={Number(total)} page={page} pageSize={PAGE_SIZE} filters={{ q }} loadError={error?.message} />
    </AdminShell>
  );
}
