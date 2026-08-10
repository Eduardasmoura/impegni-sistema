import { getCurrentCompany } from "@/lib/company";
import { redirect } from "next/navigation";
import { EquipeView } from "./equipe-view";

export default async function EquipePage() {
  const current = await getCurrentCompany();
  if (!current) redirect("/onboarding");
  return <EquipeView companyId={current.company.id} />;
}
