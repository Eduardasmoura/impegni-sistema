import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { PlanosView } from "./planos-view";
import type { Tables } from "@/lib/supabase/database.types";

export default async function PlanosPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: plans }, { data: features }] = await Promise.all([
    supabase.from("plans").select("*").order("price_cents"),
    supabase.from("plan_features").select("*").order("feature_key"),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <PlanosView plans={(plans as Tables<"plans">[]) ?? []} features={(features as Tables<"plan_features">[]) ?? []} />
    </AdminShell>
  );
}
