import { getCurrentCompany } from "@/lib/company";
import { getCurrentProfile } from "@/lib/profile";
import { redirect } from "next/navigation";
import { RelatoriosView } from "./relatorios-view";

export default async function RelatoriosPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  const profile = await getCurrentProfile();
  return <RelatoriosView companyId={current.company.id} companyName={current.company.name} profileId={profile?.id ?? null} />;
}
