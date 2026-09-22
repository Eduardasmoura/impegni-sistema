import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { NovaEmpresaView } from "./nova-empresa-view";

export default async function NovaEmpresaPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: segments }, { data: plans }] = await Promise.all([
    supabase.from("segments").select("id, name").eq("active", true).order("name"),
    supabase.from("plans").select("id, name, price_cents").eq("active", true).order("price_cents"),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <NovaEmpresaView segments={segments ?? []} plans={plans ?? []} />
    </AdminShell>
  );
}
