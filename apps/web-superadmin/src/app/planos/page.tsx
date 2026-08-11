import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminNav } from "@/components/admin-nav";
import { PlanosView } from "./planos-view";
import type { Tables } from "@/lib/supabase/database.types";

export default async function PlanosPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: plans }, { data: features }] = await Promise.all([
    supabase.from("plans").select("*").order("price_cents"),
    supabase.from("plan_features").select("*").order("feature_key"),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav userEmail={user.email} />
      <PlanosView plans={(plans as Tables<"plans">[]) ?? []} features={(features as Tables<"plan_features">[]) ?? []} />
    </div>
  );
}
