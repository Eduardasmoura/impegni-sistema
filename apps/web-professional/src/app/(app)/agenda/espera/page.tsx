import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { EsperaView } from "./espera-view";

export default async function EsperaPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <EsperaView companyId={current.company.id} />;
}
