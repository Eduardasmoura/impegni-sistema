import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { AgendaView } from "./agenda-view";

export default async function AgendaPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AgendaView companyId={current.company.id} currentUserId={user?.id ?? null} />;
}
