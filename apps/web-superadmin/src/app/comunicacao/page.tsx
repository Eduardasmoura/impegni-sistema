import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { ComunicacaoView } from "./comunicacao-view";

export default async function ComunicacaoPage() {
  const { user, supabase } = await requireSuperAdmin();

  const [{ data: announcements, error }, { data: plans }, { data: segments }, { data: companies }] = await Promise.all([
    supabase.from("platform_announcements").select("*, plans:audience_plan_id(id, name), segments:audience_segment_id(id, name), companies:audience_company_id(id, name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("plans").select("id, name").eq("active", true).order("price_cents"),
    supabase.from("segments").select("id, name").eq("active", true).order("name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <ComunicacaoView
        announcements={announcements ?? []}
        plans={plans ?? []}
        segments={segments ?? []}
        companies={companies ?? []}
        loadError={error?.message}
        currentUserId={user.id}
      />
    </AdminShell>
  );
}
