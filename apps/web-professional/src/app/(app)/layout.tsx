import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/company";
import { TopNav } from "@/components/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <TopNav companyName={current.company.name} userEmail={user.email} />
      <main>{children}</main>
    </div>
  );
}
