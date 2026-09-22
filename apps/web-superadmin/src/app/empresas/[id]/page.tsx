import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { AdminShell } from "@/components/admin-nav";
import { CentralTabs } from "./central-tabs";
import type { Tables } from "@/lib/supabase/database.types";

export default async function EmpresaDetailPage({ params }: { params: { id: string } }) {
  const { user, supabase } = await requireSuperAdmin();

  const [
    { data: company },
    { data: segments },
    { data: plans },
    { data: roles },
    { data: subscriptions },
    { data: users },
    { data: professionals },
    { data: clients },
    { data: services },
    { data: payments },
    { data: impersonations },
    { data: goals },
    { data: termsAcceptances },
  ] = await Promise.all([
    supabase.from("companies").select("*, segments(id, name)").eq("id", params.id).single(),
    supabase.from("segments").select("id, name").eq("active", true).order("name"),
    supabase.from("plans").select("*").eq("active", true).order("price_cents"),
    supabase.from("roles").select("*").order("label"),
    supabase.from("subscriptions").select("*, plans(*)").eq("company_id", params.id).order("created_at", { ascending: false }).limit(1),
    supabase.rpc("admin_list_company_users", { target_company_id: params.id }),
    supabase.from("professionals").select("id, name, role_title, active").eq("company_id", params.id).order("name"),
    supabase.from("clients").select("id, name, phone, created_at").eq("company_id", params.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("services").select("id, name, price, duration_min, active").eq("company_id", params.id).order("name"),
    supabase.from("subscription_payments").select("*").eq("company_id", params.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("impersonation_sessions").select("*").eq("company_id", params.id).order("started_at", { ascending: false }).limit(10),
    supabase.from("company_goals").select("goal_key").eq("company_id", params.id),
    supabase.from("terms_acceptances").select("document_version, accepted_at").eq("company_id", params.id).order("accepted_at", { ascending: false }).limit(1),
  ]);

  if (!company) notFound();

  const [{ count: memberCount }, { count: professionalCount }, { count: clientCount }, { count: appointmentCount }] = await Promise.all([
    supabase.from("company_members").select("*", { count: "exact", head: true }).eq("company_id", params.id).eq("active", true),
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("company_id", params.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("company_id", params.id),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("company_id", params.id)
      .neq("status", "canceled")
      .gte("scheduled_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  return (
    <AdminShell userEmail={user.email}>
      <CentralTabs
        company={company as Tables<"companies"> & { segments: Pick<Tables<"segments">, "id" | "name"> | null }}
        segments={segments ?? []}
        plans={plans ?? []}
        roles={roles ?? []}
        subscription={(subscriptions?.[0] as (Tables<"subscriptions"> & { plans: Tables<"plans"> | null }) | undefined) ?? null}
        users={users ?? []}
        professionals={professionals ?? []}
        clients={clients ?? []}
        services={services ?? []}
        payments={payments ?? []}
        impersonations={impersonations ?? []}
        goals={(goals ?? []).map((g) => g.goal_key)}
        termsAcceptance={termsAcceptances?.[0] ?? null}
        usage={{
          users: memberCount ?? 0,
          professionals: professionalCount ?? 0,
          clients: clientCount ?? 0,
          appointments: appointmentCount ?? 0,
        }}
      />
    </AdminShell>
  );
}
