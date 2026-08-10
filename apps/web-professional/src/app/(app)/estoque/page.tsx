import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { EstoqueView } from "./estoque-view";

export default async function EstoquePage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <EstoqueView companyId={current.company.id} />;
}
