import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { FinanceiroView } from "./financeiro-view";

export default async function FinanceiroPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <FinanceiroView companyId={current.company.id} />;
}
