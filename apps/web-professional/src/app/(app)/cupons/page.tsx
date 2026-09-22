import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { CuponsView } from "./cupons-view";

export default async function CuponsPage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <CuponsView companyId={current.company.id} />;
}
