import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { ConfiguracoesView } from "./configuracoes-view";

export default async function ConfiguracoesPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: segments }, { data: roles }, { count: superAdminCount }] = await Promise.all([
    supabase.from("segments").select("*").order("name"),
    supabase.from("roles").select("*").order("label"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role_platform", "super_admin"),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <ConfiguracoesView segments={segments ?? []} roles={roles ?? []} superAdminCount={superAdminCount ?? 0} />
    </AdminShell>
  );
}
