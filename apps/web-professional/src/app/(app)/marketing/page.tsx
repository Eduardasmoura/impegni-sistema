import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/company";
import { MarketingView } from "./marketing-view";

export default async function MarketingPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  const isManager = current.roleEmpresa === "owner" || current.roleEmpresa === "admin";
  return <MarketingView companyId={current.company.id} isManager={isManager} />;
}
