import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SegurancaView } from "./seguranca-view";

export default async function SegurancaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SegurancaView userEmail={user.email ?? ""} />;
}
