import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <DashboardView companyId={current.company.id} />;
}
