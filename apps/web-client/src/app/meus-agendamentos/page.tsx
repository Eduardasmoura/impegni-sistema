import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { MeusAgendamentosView } from "./meus-agendamentos-view";

export default async function MeusAgendamentosPage({ searchParams }: { searchParams: { agendado?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/meus-agendamentos");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <MeusAgendamentosView userId={user.id} agendadoId={typeof searchParams.agendado === "string" ? searchParams.agendado : undefined} />
    </div>
  );
}
