import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminNav } from "@/components/admin-nav";
import { EmpresasView } from "./empresas-view";
import type { Tables } from "@/lib/supabase/database.types";

export default async function EmpresasPage() {
  const { user, supabase } = await requireSuperAdmin();

  const { data: companies, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav userEmail={user.email} />
      <EmpresasView companies={(companies as Tables<"companies">[]) ?? []} loadError={error?.message} />
    </div>
  );
}
