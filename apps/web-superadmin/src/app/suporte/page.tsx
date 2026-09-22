import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { SuporteView } from "./suporte-view";

// Chamados são admin-only (policy `support_tickets_all_admin_only`) —
// não existe leitura pública/da empresa hoje, então este é o único lugar
// onde eles aparecem.
export default async function SuportePage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: tickets, error }, { data: companies }] = await Promise.all([
    supabase.from("support_tickets").select("*, companies(id, name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  const openerIds = Array.from(new Set((tickets ?? []).flatMap((t) => [t.opened_by, t.assigned_to]).filter((id): id is string => !!id)));
  const { data: profiles } = openerIds.length > 0 ? await supabase.from("profiles").select("id, full_name").in("id", openerIds) : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows = (tickets ?? []).map((t) => ({
    ...t,
    opened_by_name: (t.opened_by && nameById.get(t.opened_by)) || null,
    assigned_to_name: (t.assigned_to && nameById.get(t.assigned_to)) || null,
  }));

  return (
    <AdminShell userEmail={user.email}>
      <SuporteView tickets={rows} companies={companies ?? []} loadError={error?.message} currentUserId={user.id} />
    </AdminShell>
  );
}
