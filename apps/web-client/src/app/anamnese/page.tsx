import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { AnamneseView } from "./anamnese-view";

export default async function AnamnesePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/anamnese");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <AnamneseView userId={user.id} />
    </div>
  );
}
