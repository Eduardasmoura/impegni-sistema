import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { FavoritosView } from "./favoritos-view";

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/favoritos");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <FavoritosView userId={user.id} />
    </div>
  );
}
