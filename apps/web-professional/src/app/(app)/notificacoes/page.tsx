import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { NotificacoesView } from "./notificacoes-view";

export default async function NotificacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  return (
    <NotificacoesView
      companyId={current.company.id}
      whatsappReminderEnabled={current.company.whatsapp_reminder_enabled}
      isManager={current.roleEmpresa === "owner" || current.roleEmpresa === "admin"}
    />
  );
}
