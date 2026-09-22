import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { PerfilView } from "./perfil-view";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  return <PerfilView userEmail={user.email ?? ""} userId={user.id} profile={profile} createdAt={user.created_at ?? null} />;
}
