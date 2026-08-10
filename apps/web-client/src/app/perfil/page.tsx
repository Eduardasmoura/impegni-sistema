import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { PerfilView } from "./perfil-view";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/perfil");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PerfilView userEmail={user.email ?? ""} userId={user.id} profile={profile} />
    </div>
  );
}
