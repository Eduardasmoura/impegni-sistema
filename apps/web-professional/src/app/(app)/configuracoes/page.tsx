import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesView } from "./configuracoes-view";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ConfiguracoesView />;
}
